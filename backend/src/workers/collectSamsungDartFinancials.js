import { loadEnv } from '../utils/env.js';
import { collectDartFinancialRaw } from '../services/dartFinancialService.js';

loadEnv();

const fiscalYear = Number(process.argv[2] || 2024);
const reportType = process.argv[3] || 'annual';
const forceRefresh = process.argv.includes('--force');

try {
  const result = await collectDartFinancialRaw({
    stockId: 1,
    fiscalYear,
    reportType,
    forceRefresh
  });

  const { data, ...summary } = result;
  console.log(JSON.stringify(summary, null, 2));
} catch (error) {
  console.error(JSON.stringify({
    error: error.message,
    statusCode: error.statusCode || 500,
    details: error.details || null
  }, null, 2));
  process.exit(1);
}
