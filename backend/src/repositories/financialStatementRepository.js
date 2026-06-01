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

const LINE_ITEM_SELECT = [
  'line_item_id',
  'statement_id',
  'account_code',
  'account_name',
  'amount',
  'unit',
  'display_order',
  'created_at'
].join(',');

export async function findFinancialLineItem({ statementId, accountName, accountCode }) {
  const rows = await requestSupabaseRest(
    `financial_line_items?select=${LINE_ITEM_SELECT}` +
      `&statement_id=eq.${Number(statementId)}` +
      `&account_name=eq.${encodeURIComponent(accountName)}` +
      `&account_code=eq.${encodeURIComponent(accountCode || '')}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function upsertFinancialLineItem(lineItem) {
  const existing = await findFinancialLineItem({
    statementId: lineItem.statement_id,
    accountName: lineItem.account_name,
    accountCode: lineItem.account_code
  });

  if (existing) {
    return updateFinancialLineItem(existing.line_item_id, lineItem);
  }

  return createFinancialLineItem(lineItem);
}

export async function createFinancialLineItem(lineItem) {
  const rows = await requestSupabaseRest('financial_line_items', {
    method: 'POST',
    prefer: 'return=representation',
    body: lineItem
  });

  return rows[0];
}

export async function updateFinancialLineItem(lineItemId, patch) {
  const rows = await requestSupabaseRest(`financial_line_items?line_item_id=eq.${lineItemId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      amount: patch.amount,
      unit: patch.unit,
      display_order: patch.display_order
    }
  });

  return rows[0];
}

export async function listFinancialLineItemsByStockYear({ stockId, fiscalYear }) {
  return requestSupabaseRest(
    `financial_line_items?select=${LINE_ITEM_SELECT},financial_statement_snapshots!inner(stock_id,fiscal_year,statement_type,report_name)` +
      `&financial_statement_snapshots.stock_id=eq.${Number(stockId)}` +
      `&financial_statement_snapshots.fiscal_year=eq.${Number(fiscalYear)}` +
      '&order=display_order.asc'
  );
}
