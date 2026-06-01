import { loadEnv } from '../utils/env.js';
import { saveFinancialStatementSnapshotsFromDart } from '../services/financialSnapshotService.js';

loadEnv();

const fiscalYear = Number(process.argv[2] || 2024);
const reportType = process.argv[3] || 'annual';

try {
  const result = await saveFinancialStatementSnapshotsFromDart({
    stockId: 1,
    fiscalYear,
    reportType
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
