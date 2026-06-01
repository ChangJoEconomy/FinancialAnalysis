import { findStockById } from '../repositories/stockRepository.js';
import { saveJsonCacheWithMetadata } from './cacheMetadataService.js';
import { getFreshCacheByLogicalKey } from './cacheMetadataService.js';
import {
  cacheFileExists,
  getCacheFileInfo,
  readJsonCacheFile,
  resolveCachePath,
  toProjectRelativePath,
  writeJsonCacheFile
} from '../utils/cachePaths.js';

const DART_FINANCIAL_ENDPOINT = 'https://opendart.fss.or.kr/api/fnlttSinglAcntAll.json';
const REPORT_TYPES = {
  annual: { reportCode: '11011', fileName: 'annual.json', periodType: 'annual' },
  q1: { reportCode: '11013', fileName: 'q1.json', periodType: 'quarterly' },
  q2: { reportCode: '11012', fileName: 'q2.json', periodType: 'quarterly' },
  q3: { reportCode: '11014', fileName: 'q3.json', periodType: 'quarterly' }
};

export async function collectDartFinancialRaw({ stockId, fiscalYear, reportType = 'annual', forceRefresh = false }) {
  const stock = await findStockById(stockId);
  if (!stock) {
    throw Object.assign(new Error(`Stock not found: ${stockId}`), { statusCode: 404 });
  }

  if (!stock.dart_corp_code) {
    throw Object.assign(new Error(`Missing dart_corp_code for stock_id=${stockId}`), { statusCode: 400 });
  }

  const report = resolveReportType(reportType);
  const logicalKey = buildDartFinancialLogicalKey({
    stockCode: stock.stock_code,
    fiscalYear,
    reportType
  });
  const cachePathSegments = ['dart', stock.stock_code, String(fiscalYear), report.fileName];
  const absoluteCachePath = resolveCachePath(...cachePathSegments);

  if (!forceRefresh) {
    const cached = await tryReadFreshCache(logicalKey, absoluteCachePath);
    if (cached) {
      return cached;
    }
  }

  const dartResponse = await fetchDartFinancialStatementRaw({
    corpCode: stock.dart_corp_code,
    fiscalYear,
    reportCode: report.reportCode
  });

  const expiresAt = buildDefaultExpiresAt();
  let cacheMetadata = null;
  let metadataWarning = null;

  try {
    cacheMetadata = await saveJsonCacheWithMetadata({
      provider: 'DART',
      cacheType: 'dart_raw',
      targetType: 'financial_statement',
      targetId: `${stock.stock_code}:${fiscalYear}:${reportType}`,
      stockId: stock.stock_id,
      logicalKey,
      cachePathSegments,
      data: dartResponse,
      periodStart: `${fiscalYear}-01-01`,
      periodEnd: `${fiscalYear}-12-31`,
      expiresAt,
      metadata: {
        stock_code: stock.stock_code,
        dart_corp_code: stock.dart_corp_code,
        report_type: reportType,
        reprt_code: report.reportCode,
        fs_div: 'CFS'
      }
    });
  } catch (error) {
    metadataWarning = error.message;
    writeJsonCacheFile(absoluteCachePath, dartResponse);
  }

  const fileInfo = getCacheFileInfo(absoluteCachePath);

  return {
    cacheHit: false,
    source: 'dart_api',
    stock,
    fiscalYear,
    reportType,
    logicalKey,
    filePath: toProjectRelativePath(fileInfo.filePath),
    byteSize: fileInfo.byteSize,
    contentHash: fileInfo.contentHash,
    cacheMetadata,
    metadataWarning,
    dartStatus: dartResponse.status,
    dartMessage: dartResponse.message || null,
    itemCount: Array.isArray(dartResponse.list) ? dartResponse.list.length : 0,
    data: dartResponse
  };
}

export async function fetchDartFinancialStatementRaw({ corpCode, fiscalYear, reportCode }) {
  const apiKey = process.env.DART_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error('Missing required environment variable: DART_API_KEY'), { statusCode: 500 });
  }

  const url = new URL(DART_FINANCIAL_ENDPOINT);
  url.search = new URLSearchParams({
    crtfc_key: apiKey,
    corp_code: corpCode,
    bsns_year: String(fiscalYear),
    reprt_code: reportCode,
    fs_div: 'CFS'
  }).toString();

  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok) {
    throw Object.assign(new Error(`DART request failed: ${response.status}`), {
      statusCode: response.status,
      details: data
    });
  }

  if (data.status && data.status !== '000') {
    throw Object.assign(new Error(`DART returned ${data.status}: ${data.message || 'Unknown error'}`), {
      statusCode: 502,
      details: data
    });
  }

  return data;
}

export function buildDartFinancialLogicalKey({ stockCode, fiscalYear, reportType }) {
  return `DART:dart_raw:${stockCode}:${fiscalYear}:${reportType}`;
}

function resolveReportType(reportType) {
  const report = REPORT_TYPES[reportType];
  if (!report) {
    throw Object.assign(new Error(`Unsupported DART report type: ${reportType}`), { statusCode: 400 });
  }
  return report;
}

async function tryReadFreshCache(logicalKey, absoluteCachePath) {
  try {
    const metadata = await getFreshCacheByLogicalKey(logicalKey);
    if (metadata && cacheFileExists(absoluteCachePath)) {
      const cachedData = readJsonCacheFile(absoluteCachePath);
      if (isDartFinancialPayload(cachedData)) {
        return buildCacheHitResult({ logicalKey, absoluteCachePath, metadata, data: cachedData, source: 'metadata_cache' });
      }
    }
  } catch {
    // Supabase metadata can be unavailable in local development; fall back to file cache.
  }

  if (cacheFileExists(absoluteCachePath)) {
    const cachedData = readJsonCacheFile(absoluteCachePath);
    if (isDartFinancialPayload(cachedData)) {
      return buildCacheHitResult({ logicalKey, absoluteCachePath, metadata: null, data: cachedData, source: 'file_cache' });
    }
  }

  return null;
}

function buildCacheHitResult({ logicalKey, absoluteCachePath, metadata, data, source }) {
  const fileInfo = getCacheFileInfo(absoluteCachePath);
  return {
    cacheHit: true,
    source,
    logicalKey,
    filePath: toProjectRelativePath(fileInfo.filePath),
    byteSize: fileInfo.byteSize,
    contentHash: fileInfo.contentHash,
    cacheMetadata: metadata,
    dartStatus: data.status,
    dartMessage: data.message || null,
    itemCount: Array.isArray(data.list) ? data.list.length : 0,
    data
  };
}

function isDartFinancialPayload(data) {
  return data && data.status === '000' && Array.isArray(data.list);
}

function buildDefaultExpiresAt() {
  return new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
}
