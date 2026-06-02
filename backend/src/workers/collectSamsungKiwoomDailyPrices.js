import { collectKiwoomDailyPrices } from '../services/stockPriceService.js';
import { loadEnv } from '../utils/env.js';

loadEnv();

const forceRefresh = process.argv.includes('--force');

try {
  const result = await collectKiwoomDailyPrices({
    stockId: 1,
    forceRefresh
  });

  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    error: error.message,
    statusCode: error.statusCode || 500,
    details: error.details || null
  }, null, 2));
  process.exit(1);
}
