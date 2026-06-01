import { upsertFinancialStatementSnapshot } from '../repositories/financialStatementRepository.js';
import { collectDartFinancialRaw } from './dartFinancialService.js';

const STATEMENT_TYPE_BY_DART_DIV = {
  BS: 'balance_sheet',
  IS: 'income_statement',
  CF: 'cash_flow'
};

const FISCAL_QUARTER_BY_REPORT_TYPE = {
  annual: 0,
  q1: 1,
  q2: 2,
  q3: 3
};

export async function saveFinancialStatementSnapshotsFromDart({
  stockId,
  fiscalYear,
  reportType = 'annual'
}) {
  const dartResult = await collectDartFinancialRaw({
    stockId,
    fiscalYear,
    reportType
  });

  if (!dartResult.cacheMetadata?.cache_file_id) {
    throw Object.assign(new Error('DART cache metadata is required before saving financial statement snapshots.'), {
      statusCode: 500
    });
  }

  const rowsByStatementType = groupDartRowsByStatementType(dartResult.data.list || []);
  const snapshots = [];

  for (const [statementType, rows] of rowsByStatementType.entries()) {
    const firstRow = rows[0];
    snapshots.push(await upsertFinancialStatementSnapshot({
      stock_id: stockId,
      fiscal_year: Number(fiscalYear),
      fiscal_quarter: FISCAL_QUARTER_BY_REPORT_TYPE[reportType] ?? 0,
      period_type: reportType === 'annual' ? 'annual' : 'quarterly',
      statement_type: statementType,
      currency: firstRow.currency || 'KRW',
      report_name: firstRow.sj_nm,
      dart_report_no: firstRow.rcept_no,
      source_provider: 'DART',
      cache_file_id: dartResult.cacheMetadata.cache_file_id,
      data_version: dartResult.contentHash?.slice(0, 50)
    }));
  }

  return {
    stockId,
    fiscalYear: Number(fiscalYear),
    reportType,
    cacheFileId: dartResult.cacheMetadata.cache_file_id,
    source: dartResult.source,
    cacheHit: dartResult.cacheHit,
    savedCount: snapshots.length,
    snapshots
  };
}

function groupDartRowsByStatementType(rows) {
  const grouped = new Map();

  for (const row of rows) {
    const statementType = STATEMENT_TYPE_BY_DART_DIV[row.sj_div];
    if (!statementType) {
      continue;
    }

    if (!grouped.has(statementType)) {
      grouped.set(statementType, []);
    }
    grouped.get(statementType).push(row);
  }

  return grouped;
}
