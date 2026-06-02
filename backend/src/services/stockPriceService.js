import { findStockById } from '../repositories/stockRepository.js';
import {
  deleteStockPricesBefore,
  listRecentStockPrices,
  replaceStockPriceCacheRange,
  upsertStockPricesDaily
} from '../repositories/stockPriceRepository.js';
import {
  getCacheFileInfo,
  resolveCachePath,
  toProjectRelativePath,
  writeJsonCacheFile
} from '../utils/cachePaths.js';
import {
  readFreshJsonCacheByLogicalKey,
  saveJsonCacheWithMetadata
} from './cacheMetadataService.js';
import { buildCacheExpiresAt, getCacheTtlMs } from './cachePolicy.js';

const KIWOOM_DAILY_CHART_API_ID = 'ka10081';
const KIWOOM_DAILY_CHART_ENDPOINT = '/api/dostk/chart';
const KIWOOM_STOCK_BASIC_INFO_API_ID = 'ka10001';
const KIWOOM_STOCK_INFO_ENDPOINT = '/api/dostk/stkinfo';
const DEFAULT_RECENT_DAYS = 90;
const DEFAULT_HISTORY_DAYS = 370;
const DEFAULT_CHART_DAYS = 30;
const DEFAULT_MAX_PAGES = 5;

let tokenCache = null;

export async function getRecentStockPrices({ stockId, days = DEFAULT_CHART_DAYS }) {
  const stock = await requireStock(stockId);
  const normalizedDays = parsePositiveInteger(days, 'days', { defaultValue: DEFAULT_CHART_DAYS, max: 90 });
  const prices = (await listRecentStockPrices(stock.stock_id, normalizedDays)).reverse();

  return {
    stock,
    days: normalizedDays,
    prices,
    latest: prices.at(-1) || null
  };
}

export async function collectKiwoomDailyPrices({
  stockId,
  recentDays = DEFAULT_RECENT_DAYS,
  historyDays = DEFAULT_HISTORY_DAYS,
  forceRefresh = false
}) {
  const stock = await requireStock(stockId);
  const normalizedRecentDays = parsePositiveInteger(recentDays, 'recentDays', {
    defaultValue: DEFAULT_RECENT_DAYS,
    max: 365
  });
  const normalizedHistoryDays = parsePositiveInteger(historyDays, 'historyDays', {
    defaultValue: DEFAULT_HISTORY_DAYS,
    max: 3650
  });
  const logicalKey = buildKiwoomDailyPriceLogicalKey(stock.stock_code);
  const cachePathSegments = ['prices', stock.stock_code, 'daily.json'];
  const absoluteCachePath = resolveCachePath(...cachePathSegments);

  if (!forceRefresh) {
    const cached = await tryReadFreshPriceCache({ logicalKey, absoluteCachePath });
    if (cached) {
      return persistCollectedPrices({
        stock,
        logicalKey,
        rawData: cached.data,
        cacheMetadata: cached.cacheMetadata,
        cacheHit: true,
        source: cached.source,
        recentDays: normalizedRecentDays
      });
    }
  }

  const rawData = await fetchKiwoomDailyChartRaw({
    stockCode: stock.stock_code,
    historyDays: normalizedHistoryDays
  });
  const normalizedPrices = normalizeKiwoomDailyPrices(rawData);
  if (!normalizedPrices.length) {
    throw badGateway('Kiwoom daily chart response did not include any prices.', rawData);
  }

  const periodStart = normalizedPrices[0].trade_date;
  const periodEnd = normalizedPrices.at(-1).trade_date;
  let cacheMetadata = null;
  let metadataWarning = null;

  try {
    cacheMetadata = await saveJsonCacheWithMetadata({
      provider: 'KIWOOM',
      cacheType: 'price_daily',
      targetType: 'price',
      targetId: stock.stock_code,
      stockId: stock.stock_id,
      logicalKey,
      cachePathSegments,
      data: rawData,
      rowCount: normalizedPrices.length,
      periodStart,
      periodEnd,
      expiresAt: buildCacheExpiresAt('price_daily'),
      metadata: {
        stock_code: stock.stock_code,
        api_id: KIWOOM_DAILY_CHART_API_ID,
        adjusted: true,
        interval_type: 'daily'
      }
    });
  } catch (error) {
    metadataWarning = error.message;
    writeJsonCacheFile(absoluteCachePath, rawData);
  }

  return persistCollectedPrices({
    stock,
    logicalKey,
    rawData,
    cacheMetadata,
    metadataWarning,
    cacheHit: false,
    source: 'kiwoom_api',
    recentDays: normalizedRecentDays
  });
}

export async function collectKiwoomStockBasicInfo({ stockId, forceRefresh = false }) {
  const stock = await requireStock(stockId);
  const logicalKey = buildKiwoomStockBasicInfoLogicalKey(stock.stock_code);
  const cachePathSegments = ['prices', stock.stock_code, 'basic-info.json'];
  const absoluteCachePath = resolveCachePath(...cachePathSegments);

  if (!forceRefresh) {
    const cached = await tryReadFreshCache({ logicalKey, absoluteCachePath });
    if (cached) {
      return {
        cacheHit: true,
        source: cached.source,
        stock,
        logicalKey,
        cacheMetadata: cached.cacheMetadata,
        data: normalizeKiwoomStockBasicInfo(cached.data)
      };
    }
  }

  const rawData = await fetchKiwoomStockBasicInfoRaw(stock.stock_code);
  const data = normalizeKiwoomStockBasicInfo(rawData);
  let cacheMetadata = null;
  let metadataWarning = null;

  try {
    cacheMetadata = await saveJsonCacheWithMetadata({
      provider: 'KIWOOM',
      cacheType: 'stock_basic_info',
      targetType: 'stock',
      targetId: stock.stock_code,
      stockId: stock.stock_id,
      logicalKey,
      cachePathSegments,
      data: rawData,
      periodStart: data.tradeDate,
      periodEnd: data.tradeDate,
      expiresAt: buildCacheExpiresAt('stock_basic_info'),
      metadata: {
        stock_code: stock.stock_code,
        api_id: KIWOOM_STOCK_BASIC_INFO_API_ID
      }
    });
  } catch (error) {
    metadataWarning = error.message;
    writeJsonCacheFile(absoluteCachePath, rawData);
  }

  return {
    cacheHit: false,
    source: 'kiwoom_api',
    stock,
    logicalKey,
    cacheMetadata,
    metadataWarning,
    data
  };
}

export async function fetchKiwoomAccessToken({ forceRefresh = false } = {}) {
  if (!forceRefresh && tokenCache && tokenCache.expiresAt.getTime() - Date.now() > 60_000) {
    return tokenCache.token;
  }

  const appKey = requireEnv('STOCK_APP_KEY');
  const secretKey = requireEnv('STOCK_SECRET_KEY');
  const response = await fetch(`${getKiwoomApiBaseUrl()}/oauth2/token`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UTF-8'
    },
    body: JSON.stringify({
      grant_type: 'client_credentials',
      appkey: appKey,
      secretkey: secretKey
    })
  });
  const data = await readJson(response);

  if (!response.ok || !isKiwoomSuccess(data) || !data?.token) {
    throw badGateway(`Kiwoom token request failed: ${response.status}`, data);
  }

  tokenCache = {
    token: data.token,
    expiresAt: parseKiwoomTokenExpiry(data.expires_dt)
  };

  return tokenCache.token;
}

export async function fetchKiwoomStockBasicInfoRaw(stockCode) {
  const token = await fetchKiwoomAccessToken();
  const response = await fetch(`${getKiwoomApiBaseUrl()}${KIWOOM_STOCK_INFO_ENDPOINT}`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json;charset=UTF-8',
      authorization: `Bearer ${token}`,
      'api-id': KIWOOM_STOCK_BASIC_INFO_API_ID
    },
    body: JSON.stringify({
      stk_cd: stockCode
    })
  });
  const data = await readJson(response);

  if (!response.ok || !isKiwoomSuccess(data)) {
    throw badGateway(`Kiwoom stock basic info request failed: ${response.status}`, data);
  }

  return data;
}

export async function fetchKiwoomDailyChartRaw({
  stockCode,
  baseDate = formatDateInSeoul(new Date()),
  historyDays = DEFAULT_HISTORY_DAYS,
  maxPages = DEFAULT_MAX_PAGES
}) {
  const token = await fetchKiwoomAccessToken();
  const cutoffDate = shiftDate(baseDate, -historyDays);
  const pages = [];
  let continuation = null;

  for (let pageIndex = 0; pageIndex < maxPages; pageIndex += 1) {
    const response = await fetch(`${getKiwoomApiBaseUrl()}${KIWOOM_DAILY_CHART_ENDPOINT}`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json;charset=UTF-8',
        authorization: `Bearer ${token}`,
        'api-id': KIWOOM_DAILY_CHART_API_ID,
        ...(continuation ? { 'cont-yn': 'Y', 'next-key': continuation } : {})
      },
      body: JSON.stringify({
        stk_cd: stockCode,
        base_dt: baseDate.replaceAll('-', ''),
        upd_stkpc_tp: '1'
      })
    });
    const data = await readJson(response);

    if (!response.ok || !isKiwoomSuccess(data)) {
      throw badGateway(`Kiwoom daily chart request failed: ${response.status}`, data);
    }

    const nextKey = response.headers.get('next-key');
    const hasNext = response.headers.get('cont-yn') === 'Y' && nextKey;
    pages.push({
      headers: {
        'cont-yn': response.headers.get('cont-yn'),
        'next-key': nextKey,
        'api-id': response.headers.get('api-id')
      },
      body: data
    });

    const oldestDate = findOldestTradeDate(extractDailyChartRows({ pages }));
    if (!hasNext || (oldestDate && oldestDate <= cutoffDate)) {
      break;
    }

    continuation = nextKey;
  }

  return {
    api_id: KIWOOM_DAILY_CHART_API_ID,
    stock_code: stockCode,
    requested_base_date: baseDate,
    requested_history_days: historyDays,
    pages
  };
}

export function normalizeKiwoomDailyPrices(rawData) {
  const byTradeDate = new Map();

  for (const row of extractDailyChartRows(rawData)) {
    const tradeDate = normalizeTradeDate(pick(row, ['dt', 'stk_dt', 'date', 'trade_date']));
    const closePrice = parseNumeric(pick(row, ['cur_prc', 'close_pric', 'close_price']), { absolute: true });
    if (!tradeDate || closePrice === null) {
      continue;
    }

    byTradeDate.set(tradeDate, {
      trade_date: tradeDate,
      open_price: parseNumeric(pick(row, ['open_pric', 'open_price']), { absolute: true }),
      high_price: parseNumeric(pick(row, ['high_pric', 'high_price']), { absolute: true }),
      low_price: parseNumeric(pick(row, ['low_pric', 'low_price']), { absolute: true }),
      close_price: closePrice,
      adjusted_close: closePrice,
      volume: parseNumeric(pick(row, ['trde_qty', 'volume']), { absolute: true }),
      change_amount: parseNumeric(pick(row, ['pred_pre', 'change_amount'])),
      change_rate: parseNumeric(pick(row, ['flu_rt', 'change_rate'])),
      source_provider: 'KIWOOM'
    });
  }

  const prices = [...byTradeDate.values()].sort((left, right) => left.trade_date.localeCompare(right.trade_date));
  return prices.map((price, index) => ({
    ...price,
    change_rate: price.change_rate ?? calculateChangeRate(price.close_price, prices[index - 1]?.close_price)
  }));
}

export function buildKiwoomDailyPriceLogicalKey(stockCode) {
  return `KIWOOM:price_daily:${stockCode}`;
}

export function normalizeKiwoomStockBasicInfo(rawData) {
  return {
    stockCode: rawData.stk_cd || null,
    stockName: rawData.stk_nm || null,
    tradeDate: formatDateInSeoul(new Date()),
    currentPrice: parseNumeric(rawData.cur_prc, { absolute: true }),
    changeAmount: parseNumeric(rawData.pred_pre),
    changeRate: parseNumeric(rawData.flu_rt),
    volume: parseNumeric(rawData.trde_qty, { absolute: true }),
    per: parseNumeric(rawData.per),
    eps: parseNumeric(rawData.eps),
    pbr: parseNumeric(rawData.pbr),
    bps: parseNumeric(rawData.bps)
  };
}

export function buildKiwoomStockBasicInfoLogicalKey(stockCode) {
  return `KIWOOM:stock_basic_info:${stockCode}`;
}

async function persistCollectedPrices({
  stock,
  logicalKey,
  rawData,
  cacheMetadata,
  metadataWarning = null,
  cacheHit,
  source,
  recentDays
}) {
  const prices = normalizeKiwoomDailyPrices(rawData);
  if (!prices.length) {
    throw badGateway('Cached Kiwoom daily chart data did not include any prices.', rawData);
  }

  const recentPrices = prices.slice(-recentDays).map((price) => ({
    stock_id: stock.stock_id,
    ...price
  }));
  await upsertStockPricesDaily(recentPrices);
  await deleteStockPricesBefore(stock.stock_id, recentPrices[0].trade_date);

  let rangeWarning = null;
  let cacheRange = null;
  if (cacheMetadata?.cache_file_id) {
    try {
      cacheRange = await replaceStockPriceCacheRange({
        stock_id: stock.stock_id,
        interval_type: 'daily',
        period_start: prices[0].trade_date,
        period_end: prices.at(-1).trade_date,
        adjusted: true,
        cache_file_id: cacheMetadata.cache_file_id
      });
    } catch (error) {
      rangeWarning = error.message;
    }
  }

  const fileInfo = getCacheFileInfo(resolveCachePath('prices', stock.stock_code, 'daily.json'));
  return {
    cacheHit,
    source,
    stock,
    logicalKey,
    filePath: toProjectRelativePath(fileInfo.filePath),
    byteSize: fileInfo.byteSize,
    contentHash: fileInfo.contentHash,
    longHistoryCount: prices.length,
    recentSavedCount: recentPrices.length,
    periodStart: prices[0].trade_date,
    periodEnd: prices.at(-1).trade_date,
    latest: recentPrices.at(-1),
    cacheMetadata,
    cacheRange,
    metadataWarning,
    rangeWarning
  };
}

async function tryReadFreshPriceCache({ logicalKey, absoluteCachePath }) {
  return tryReadFreshCache({ logicalKey, absoluteCachePath });
}

async function tryReadFreshCache({ logicalKey, absoluteCachePath }) {
  const cacheType = logicalKey.includes(':stock_basic_info:')
    ? 'stock_basic_info'
    : 'price_daily';

  return readFreshJsonCacheByLogicalKey({
    logicalKey,
    absolutePath: absoluteCachePath,
    fallbackTtlMs: getCacheTtlMs(cacheType)
  });
}

function extractDailyChartRows(rawData) {
  if (Array.isArray(rawData)) {
    return rawData;
  }

  const bodies = Array.isArray(rawData?.pages)
    ? rawData.pages.map((page) => page.body || {})
    : [rawData || {}];

  return bodies.flatMap((body) => (
    body.stk_dt_pole_chart_qry
    || body.stk_dt_chart_qry
    || body.output
    || body.list
    || []
  ));
}

function findOldestTradeDate(rows) {
  return rows
    .map((row) => normalizeTradeDate(pick(row, ['dt', 'stk_dt', 'date', 'trade_date'])))
    .filter(Boolean)
    .sort()[0] || null;
}

function pick(object, keys) {
  for (const key of keys) {
    if (object?.[key] !== undefined && object[key] !== null && object[key] !== '') {
      return object[key];
    }
  }

  return null;
}

function parseNumeric(value, { absolute = false } = {}) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const normalized = Number(String(value).replaceAll(',', '').replace('%', '').trim());
  if (!Number.isFinite(normalized)) {
    return null;
  }

  return absolute ? Math.abs(normalized) : normalized;
}

function normalizeTradeDate(value) {
  const normalized = String(value || '').replaceAll('-', '');
  if (!/^\d{8}$/.test(normalized)) {
    return null;
  }

  return `${normalized.slice(0, 4)}-${normalized.slice(4, 6)}-${normalized.slice(6, 8)}`;
}

function calculateChangeRate(closePrice, previousClosePrice) {
  if (!previousClosePrice) {
    return null;
  }

  return Number((((closePrice - previousClosePrice) / previousClosePrice) * 100).toFixed(4));
}

function parseKiwoomTokenExpiry(value) {
  const match = String(value || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
  if (!match) {
    return new Date(Date.now() + 1000 * 60 * 60 * 23);
  }

  return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}+09:00`);
}

function formatDateInSeoul(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function shiftDate(dateText, days) {
  const date = new Date(`${dateText}T12:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() + days);
  return formatDateInSeoul(date);
}

function getKiwoomApiBaseUrl() {
  return process.env.KIWOOM_API_BASE_URL || 'https://api.kiwoom.com';
}

function isKiwoomSuccess(data) {
  return data?.return_code === undefined || Number(data.return_code) === 0;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw Object.assign(new Error(`Missing required environment variable: ${name}`), { statusCode: 500 });
  }

  return value;
}

async function requireStock(stockId) {
  const normalizedStockId = Number(stockId);
  if (!Number.isInteger(normalizedStockId) || normalizedStockId <= 0) {
    throw Object.assign(new Error('stockId must be a positive integer.'), { statusCode: 400 });
  }

  const stock = await findStockById(normalizedStockId);
  if (!stock) {
    throw Object.assign(new Error('Stock not found.'), { statusCode: 404 });
  }

  return stock;
}

function parsePositiveInteger(value, name, { defaultValue, max }) {
  const numberValue = Number(value || defaultValue);
  if (!Number.isInteger(numberValue) || numberValue <= 0 || numberValue > max) {
    throw Object.assign(new Error(`${name} must be an integer between 1 and ${max}.`), { statusCode: 400 });
  }

  return numberValue;
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}

function badGateway(message, details) {
  return Object.assign(new Error(message), {
    statusCode: 502,
    details
  });
}
