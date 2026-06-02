import { loadEnv } from '../utils/env.js';
import { collectAndAnalyzeStockNews } from '../services/newsAnalysisService.js';

loadEnv();

try {
  const result = await collectAndAnalyzeStockNews({
    stockId: 1,
    limit: 5,
    forceRefresh: process.argv.includes('--force')
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
