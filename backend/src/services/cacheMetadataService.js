import {
  findFreshCacheMetadata,
  upsertCacheMetadata
} from '../repositories/cacheMetadataRepository.js';
import {
  cacheFileExists,
  getCacheFileInfo,
  isCacheFileFresh,
  readJsonCacheFile,
  resolveCachePath,
  toProjectRelativePath,
  writeJsonCacheFile
} from '../utils/cachePaths.js';

export function buildDartAnnualLogicalKey({ stockCode, fiscalYear }) {
  return `DART:dart_raw:${stockCode}:${fiscalYear}:annual`;
}

export async function saveJsonCacheWithMetadata({
  provider,
  cacheType,
  targetType,
  targetId,
  stockId,
  logicalKey,
  cachePathSegments,
  data,
  rowCount,
  periodStart,
  periodEnd,
  expiresAt,
  metadata = {}
}) {
  const absolutePath = resolveCachePath(...cachePathSegments);
  const fileInfo = writeJsonCacheFile(absolutePath, data);

  return upsertCacheMetadata({
    provider,
    cache_type: cacheType,
    target_type: targetType,
    target_id: targetId,
    stock_id: stockId,
    logical_key: logicalKey,
    file_path: toProjectRelativePath(fileInfo.filePath),
    file_format: 'json',
    compression: null,
    content_hash: fileInfo.contentHash,
    byte_size: fileInfo.byteSize,
    row_count: rowCount ?? (Array.isArray(data) ? data.length : null),
    period_start: periodStart,
    period_end: periodEnd,
    expires_at: expiresAt,
    is_active: true,
    metadata
  });
}

export async function getFreshCacheByLogicalKey(logicalKey) {
  return findFreshCacheMetadata(logicalKey);
}

export async function readFreshJsonCacheByLogicalKey({
  logicalKey,
  absolutePath,
  fallbackTtlMs,
  validate = () => true
}) {
  let metadata;

  try {
    metadata = await getFreshCacheByLogicalKey(logicalKey);
  } catch {
    return readFallbackFileCache({ absolutePath, fallbackTtlMs, validate });
  }

  if (!metadata || !cacheFileExists(absolutePath)) {
    return null;
  }

  return readJsonCache({
    absolutePath,
    source: 'metadata_cache',
    cacheMetadata: metadata,
    validate
  });
}

export function inspectExistingCacheFile(cachePathSegments) {
  const absolutePath = resolveCachePath(...cachePathSegments);
  const fileInfo = getCacheFileInfo(absolutePath);

  return {
    ...fileInfo,
    filePath: toProjectRelativePath(fileInfo.filePath)
  };
}

function readFallbackFileCache({ absolutePath, fallbackTtlMs, validate }) {
  if (!isCacheFileFresh(absolutePath, fallbackTtlMs)) {
    return null;
  }

  return readJsonCache({
    absolutePath,
    source: 'file_cache',
    cacheMetadata: null,
    validate
  });
}

function readJsonCache({ absolutePath, source, cacheMetadata, validate }) {
  try {
    const data = readJsonCacheFile(absolutePath);
    if (!validate(data)) {
      return null;
    }

    return {
      source,
      cacheMetadata,
      data
    };
  } catch {
    return null;
  }
}
