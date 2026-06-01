import {
  listFinancialStatementSnapshots,
  upsertFinancialLineItem
} from '../repositories/financialStatementRepository.js';
import { collectDartFinancialRaw } from './dartFinancialService.js';

const TARGET_LINE_ITEMS = [
  {
    statementType: 'balance_sheet',
    sjDiv: 'BS',
    accountId: 'ifrs-full_Assets',
    accountName: '자산총계',
    displayOrder: 10
  },
  {
    statementType: 'balance_sheet',
    sjDiv: 'BS',
    accountId: 'ifrs-full_Liabilities',
    accountName: '부채총계',
    displayOrder: 20
  },
  {
    statementType: 'balance_sheet',
    sjDiv: 'BS',
    accountId: 'ifrs-full_Equity',
    accountName: '자본총계',
    displayOrder: 30
  },
  {
    statementType: 'balance_sheet',
    sjDiv: 'BS',
    accountId: 'ifrs-full_CashAndCashEquivalents',
    accountName: '현금및현금성자산',
    displayOrder: 40
  },
  {
    statementType: 'income_statement',
    sjDiv: 'IS',
    accountId: 'ifrs-full_Revenue',
    accountName: '매출액',
    displayOrder: 110
  },
  {
    statementType: 'income_statement',
    sjDiv: 'IS',
    accountId: 'dart_OperatingIncomeLoss',
    accountName: '영업이익',
    displayOrder: 120
  },
  {
    statementType: 'income_statement',
    sjDiv: 'IS',
    accountId: 'ifrs-full_ProfitLoss',
    accountName: '당기순이익',
    displayOrder: 130
  },
  {
    statementType: 'cash_flow',
    sjDiv: 'CF',
    accountId: 'ifrs-full_CashFlowsFromUsedInOperatingActivities',
    accountName: '영업활동현금흐름',
    displayOrder: 210
  }
];

export async function saveFinancialLineItemsFromDart({
  stockId,
  fiscalYear,
  reportType = 'annual'
}) {
  const [dartResult, snapshots] = await Promise.all([
    collectDartFinancialRaw({ stockId, fiscalYear, reportType }),
    listFinancialStatementSnapshots({ stockId, fiscalYear })
  ]);

  const snapshotByType = new Map(snapshots.map((snapshot) => [snapshot.statement_type, snapshot]));
  const lineItems = [];
  const missing = [];

  for (const target of TARGET_LINE_ITEMS) {
    const snapshot = snapshotByType.get(target.statementType);
    const dartRow = findDartRow(dartResult.data.list || [], target);

    if (!snapshot || !dartRow) {
      missing.push({
        accountName: target.accountName,
        statementType: target.statementType,
        reason: snapshot ? 'dart_row_not_found' : 'snapshot_not_found'
      });
      continue;
    }

    lineItems.push(await upsertFinancialLineItem({
      statement_id: snapshot.statement_id,
      account_code: dartRow.account_id || '',
      account_name: target.accountName,
      amount: parseDartAmount(dartRow.thstrm_amount),
      unit: dartRow.currency || 'KRW',
      display_order: target.displayOrder
    }));
  }

  return {
    stockId,
    fiscalYear: Number(fiscalYear),
    reportType,
    cacheHit: dartResult.cacheHit,
    source: dartResult.source,
    savedCount: lineItems.length,
    missing,
    lineItems
  };
}

function findDartRow(rows, target) {
  return rows.find((row) =>
    row.sj_div === target.sjDiv &&
    row.account_id === target.accountId
  ) || rows.find((row) =>
    row.sj_div === target.sjDiv &&
    row.account_nm === target.accountName
  );
}

function parseDartAmount(value) {
  if (value === undefined || value === null || value === '' || value === '-') {
    return null;
  }

  return Number(String(value).replace(/,/g, ''));
}
