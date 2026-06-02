const HOUR_MS = 1000 * 60 * 60;
const DAY_MS = HOUR_MS * 24;

export const CACHE_POLICIES = Object.freeze({
  dart_raw: {
    ttlMs: DAY_MS * 30,
    description: 'DART financial statement raw response'
  },
  price_daily: {
    ttlMs: DAY_MS,
    description: 'Kiwoom daily price raw response'
  },
  stock_basic_info: {
    ttlMs: DAY_MS,
    description: 'Kiwoom stock basic information response'
  },
  news_raw: {
    ttlMs: HOUR_MS * 6,
    description: 'Naver news search raw response'
  },
  financial_analysis: {
    ttlMs: DAY_MS * 7,
    description: 'Financial traffic-light and LLM explanation result'
  }
});

export function getCacheTtlMs(cacheType) {
  const policy = CACHE_POLICIES[cacheType];
  if (!policy) {
    throw new Error(`Unknown cache policy: ${cacheType}`);
  }

  return policy.ttlMs;
}

export function buildCacheExpiresAt(cacheType, from = new Date()) {
  return new Date(from.getTime() + getCacheTtlMs(cacheType)).toISOString();
}

export function isCacheMetadataFresh(metadata, now = new Date()) {
  if (!metadata?.is_active) {
    return false;
  }

  if (!metadata.expires_at) {
    return true;
  }

  const expiresAt = new Date(metadata.expires_at);
  return !Number.isNaN(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

