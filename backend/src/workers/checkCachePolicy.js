import assert from 'node:assert/strict';
import { findCacheMetadataByLogicalKey } from '../repositories/cacheMetadataRepository.js';
import {
  buildCacheExpiresAt,
  CACHE_POLICIES,
  isCacheMetadataFresh
} from '../services/cachePolicy.js';
import { isCacheFileFresh, resolveCachePath } from '../utils/cachePaths.js';
import { loadEnv } from '../utils/env.js';

loadEnv();

const referenceTime = new Date('2026-01-01T00:00:00.000Z');
assert.equal(buildCacheExpiresAt('price_daily', referenceTime), '2026-01-02T00:00:00.000Z');
assert.equal(buildCacheExpiresAt('news_raw', referenceTime), '2026-01-01T06:00:00.000Z');
assert.equal(buildCacheExpiresAt('financial_analysis', referenceTime), '2026-01-08T00:00:00.000Z');
assert.equal(isCacheMetadataFresh({ is_active: true, expires_at: '2026-01-01T00:00:01.000Z' }, referenceTime), true);
assert.equal(isCacheMetadataFresh({ is_active: true, expires_at: '2025-12-31T23:59:59.000Z' }, referenceTime), false);
assert.equal(isCacheMetadataFresh({ is_active: false, expires_at: null }, referenceTime), false);

const today = formatDateInSeoul(new Date());
const targets = [
  {
    cacheType: 'dart_raw',
    logicalKey: 'DART:dart_raw:005930:2024:annual',
    pathSegments: ['dart', '005930', '2024', 'annual.json']
  },
  {
    cacheType: 'price_daily',
    logicalKey: 'KIWOOM:price_daily:005930',
    pathSegments: ['prices', '005930', 'daily.json']
  },
  {
    cacheType: 'stock_basic_info',
    logicalKey: 'KIWOOM:stock_basic_info:005930',
    pathSegments: ['prices', '005930', 'basic-info.json']
  },
  {
    cacheType: 'news_raw',
    logicalKey: `NAVER:news_search:005930:${today}`,
    pathSegments: ['news', '005930', `${today}.json`]
  }
];

const caches = [];
for (const target of targets) {
  const absolutePath = resolveCachePath(...target.pathSegments);
  let metadata = null;
  let metadataError = null;

  try {
    metadata = await findCacheMetadataByLogicalKey(target.logicalKey);
  } catch (error) {
    metadataError = error.message;
  }

  caches.push({
    cacheType: target.cacheType,
    logicalKey: target.logicalKey,
    metadataFound: Boolean(metadata),
    metadataFresh: isCacheMetadataFresh(metadata),
    expiresAt: metadata?.expires_at || null,
    localFileFreshForFallback: isCacheFileFresh(absolutePath, CACHE_POLICIES[target.cacheType].ttlMs),
    metadataError
  });
}

console.log(JSON.stringify({
  policyAssertions: 'passed',
  policies: Object.fromEntries(
    Object.entries(CACHE_POLICIES).map(([cacheType, policy]) => [
      cacheType,
      {
        ttlHours: policy.ttlMs / (1000 * 60 * 60),
        description: policy.description
      }
    ])
  ),
  caches
}, null, 2));

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

