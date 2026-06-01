import { requestSupabaseRest } from './supabaseRestRepository.js';

const SNAPSHOT_SELECT = [
  'statement_id',
  'stock_id',
  'fiscal_year',
  'fiscal_quarter',
  'period_type',
  'statement_type',
  'currency',
  'report_name',
  'dart_report_no',
  'source_provider',
  'cache_file_id',
  'fetched_at',
  'data_version'
].join(',');

export async function findFinancialStatementSnapshot({
  stockId,
  fiscalYear,
  fiscalQuarter,
  periodType,
  statementType,
  dartReportNo
}) {
  const rows = await requestSupabaseRest(
    `financial_statement_snapshots?select=${SNAPSHOT_SELECT}` +
      `&stock_id=eq.${Number(stockId)}` +
      `&fiscal_year=eq.${Number(fiscalYear)}` +
      `&fiscal_quarter=eq.${Number(fiscalQuarter)}` +
      `&period_type=eq.${encodeURIComponent(periodType)}` +
      `&statement_type=eq.${encodeURIComponent(statementType)}` +
      `&dart_report_no=eq.${encodeURIComponent(dartReportNo)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function upsertFinancialStatementSnapshot(snapshot) {
  const existing = await findFinancialStatementSnapshot({
    stockId: snapshot.stock_id,
    fiscalYear: snapshot.fiscal_year,
    fiscalQuarter: snapshot.fiscal_quarter,
    periodType: snapshot.period_type,
    statementType: snapshot.statement_type,
    dartReportNo: snapshot.dart_report_no
  });

  if (existing) {
    return updateFinancialStatementSnapshot(existing.statement_id, snapshot);
  }

  return createFinancialStatementSnapshot(snapshot);
}

export async function createFinancialStatementSnapshot(snapshot) {
  const rows = await requestSupabaseRest('financial_statement_snapshots', {
    method: 'POST',
    prefer: 'return=representation',
    body: snapshot
  });

  return rows[0];
}

export async function updateFinancialStatementSnapshot(statementId, patch) {
  const rows = await requestSupabaseRest(`financial_statement_snapshots?statement_id=eq.${statementId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      currency: patch.currency,
      report_name: patch.report_name,
      source_provider: patch.source_provider,
      cache_file_id: patch.cache_file_id,
      data_version: patch.data_version
    }
  });

  return rows[0];
}

export async function listFinancialStatementSnapshots({ stockId, fiscalYear }) {
  return requestSupabaseRest(
    `financial_statement_snapshots?select=${SNAPSHOT_SELECT}` +
      `&stock_id=eq.${Number(stockId)}` +
      `&fiscal_year=eq.${Number(fiscalYear)}` +
      '&order=statement_type.asc'
  );
}
