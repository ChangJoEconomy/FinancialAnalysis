import { loadEnv } from '../utils/env.js';
import {
  buildDartAnnualLogicalKey,
  getFreshCacheByLogicalKey,
  saveJsonCacheWithMetadata
} from '../services/cacheMetadataService.js';

loadEnv();

const stockId = 1;
const stockCode = '005930';
const fiscalYear = 2024;
const logicalKey = buildDartAnnualLogicalKey({ stockCode, fiscalYear });
const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString();

let existingCache = null;

try {
  existingCache = await getFreshCacheByLogicalKey(logicalKey);
} catch (error) {
  console.error(JSON.stringify({
    cacheLookupWarning: 'Fresh cache lookup failed. Continuing with local cache file write.',
    error: error.message
  }, null, 2));
}

if (existingCache) {
  console.log(JSON.stringify({
    cacheHit: true,
    cache: existingCache
  }, null, 2));
  process.exit(0);
}

const demoDartPayload = {
  source: 'local-dev-step-5-2',
  provider: 'DART',
  stock_code: stockCode,
  dart_corp_code: '00126380',
  fiscal_year: fiscalYear,
  report_type: 'annual',
  collected_at: new Date().toISOString(),
  note: 'Step 5-2 cache metadata smoke-test payload. Replace with real DART API response in Step 6.'
};

const cache = await saveJsonCacheWithMetadata({
  provider: 'DART',
  cacheType: 'dart_raw',
  targetType: 'financial_statement',
  targetId: `${stockCode}:${fiscalYear}:annual`,
  stockId,
  logicalKey,
  cachePathSegments: ['dart', stockCode, String(fiscalYear), 'annual.json'],
  data: demoDartPayload,
  periodStart: `${fiscalYear}-01-01`,
  periodEnd: `${fiscalYear}-12-31`,
  expiresAt,
  metadata: {
    stock_code: stockCode,
    dart_corp_code: '00126380',
    report_type: 'annual',
    smoke_test: true
  }
});

console.log(JSON.stringify({
  cacheHit: false,
  cache
}, null, 2));
