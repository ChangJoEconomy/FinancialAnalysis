import { requestSupabaseRest } from './supabaseRestRepository.js';

const CACHE_FILE_SELECT = [
  'cache_file_id',
  'provider',
  'cache_type',
  'target_type',
  'target_id',
  'stock_id',
  'logical_key',
  'file_path',
  'file_format',
  'compression',
  'content_hash',
  'byte_size',
  'row_count',
  'period_start',
  'period_end',
  'fetched_at',
  'expires_at',
  'is_active',
  'metadata'
].join(',');

export async function findCacheMetadataByLogicalKey(logicalKey) {
  const rows = await requestSupabaseRest(
    `external_data_cache_files?select=${CACHE_FILE_SELECT}&logical_key=eq.${encodeURIComponent(logicalKey)}&limit=1`
  );

  return rows[0] || null;
}

export async function upsertCacheMetadata(metadata) {
  const existing = await findCacheMetadataByLogicalKey(metadata.logical_key);

  if (existing) {
    return updateCacheMetadata(existing.cache_file_id, metadata);
  }

  return createCacheMetadata(metadata);
}

export async function createCacheMetadata(metadata) {
  const rows = await requestSupabaseRest('external_data_cache_files', {
    method: 'POST',
    prefer: 'return=representation',
    body: metadata
  });

  return rows[0];
}

export async function updateCacheMetadata(cacheFileId, patch) {
  const rows = await requestSupabaseRest(`external_data_cache_files?cache_file_id=eq.${cacheFileId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: patch
  });

  return rows[0];
}

export async function findFreshCacheMetadata(logicalKey, now = new Date()) {
  const rows = await requestSupabaseRest(
    `external_data_cache_files?select=${CACHE_FILE_SELECT}&logical_key=eq.${encodeURIComponent(logicalKey)}&is_active=eq.true&or=${encodeURIComponent(`(expires_at.is.null,expires_at.gt.${now.toISOString()})`)}&limit=1`
  );

  return rows[0] || null;
}

export async function createStockPriceCacheRange(range) {
  const rows = await requestSupabaseRest('stock_price_cache_ranges', {
    method: 'POST',
    prefer: 'return=representation',
    body: range
  });

  return rows[0];
}
