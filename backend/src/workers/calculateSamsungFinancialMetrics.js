import { loadEnv } from '../utils/env.js';
import { calculateAndSaveFinancialMetrics } from '../services/financialMetricService.js';

loadEnv();

const fiscalYear = Number(process.argv[2] || 2024);

try {
  const result = await calculateAndSaveFinancialMetrics({
    stockId: 1,
    fiscalYear
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
