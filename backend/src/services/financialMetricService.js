import {
  listFinancialLineItemsByStockYear,
  upsertFinancialMetricValue
} from '../repositories/financialStatementRepository.js';
import { saveFinancialLineItemsFromDart } from './financialLineItemService.js';
import { saveFinancialStatementSnapshotsFromDart } from './financialSnapshotService.js';
import { collectKiwoomStockBasicInfo } from './stockPriceService.js';

const REQUIRED_ACCOUNTS = [
  '자산총계',
  '부채총계',
  '자본총계',
  '현금및현금성자산',
  '매출액',
  '영업이익',
  '당기순이익',
  '영업활동현금흐름'
];

export async function calculateAndSaveFinancialMetrics({
  stockId,
  fiscalYear,
  reportType = 'annual',
  ensurePreviousYear = true
}) {
  if (ensurePreviousYear) {
    await ensureFinancialLineItems({ stockId, fiscalYear: fiscalYear - 1, reportType });
  }

  await ensureFinancialLineItems({ stockId, fiscalYear, reportType });

  const [currentItems, previousItems] = await Promise.all([
    listFinancialLineItemsByStockYear({ stockId, fiscalYear }),
    listFinancialLineItemsByStockYear({ stockId, fiscalYear: fiscalYear - 1 })
  ]);

  const current = mapLineItems(currentItems);
  const previous = mapLineItems(previousItems);
  const valuation = await tryCollectValuationMetrics(stockId);
  const metrics = buildMetrics({ stockId, fiscalYear, current, previous, valuation });
  const savedMetrics = [];

  for (const metric of metrics) {
    if (metric.metric_value === null || Number.isNaN(metric.metric_value)) {
      continue;
    }

    savedMetrics.push(await upsertFinancialMetricValue(metric));
  }

  return {
    stockId,
    fiscalYear,
    reportType,
    savedCount: savedMetrics.length,
    savedMetrics,
    skippedMetrics: valuation.skippedMetrics
  };
}

async function ensureFinancialLineItems({ stockId, fiscalYear, reportType }) {
  await saveFinancialStatementSnapshotsFromDart({ stockId, fiscalYear, reportType });
  await saveFinancialLineItemsFromDart({ stockId, fiscalYear, reportType });
}

function buildMetrics({ stockId, fiscalYear, current, previous, valuation }) {
  const currentDebtRatio = ratio(current['부채총계'], current['자본총계']);
  const previousDebtRatio = ratio(previous['부채총계'], previous['자본총계']);
  const currentOperatingMargin = ratio(current['영업이익'], current['매출액']);
  const previousOperatingMargin = ratio(previous['영업이익'], previous['매출액']);
  const currentRoe = ratio(current['당기순이익'], current['자본총계']);
  const previousRoe = ratio(previous['당기순이익'], previous['자본총계']);

  return [
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'PER',
      metricValue: valuation.per,
      unit: '배'
    }),
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'PBR',
      metricValue: valuation.pbr,
      unit: '배'
    }),
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'DEBT_RATIO',
      metricValue: currentDebtRatio,
      previousValue: previousDebtRatio,
      sourceStatementId: current.__statements.balance_sheet
    }),
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'OPERATING_MARGIN',
      metricValue: currentOperatingMargin,
      previousValue: previousOperatingMargin,
      sourceStatementId: current.__statements.income_statement
    }),
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'REVENUE_GROWTH',
      metricValue: growthRate(current['매출액'], previous['매출액']),
      previousValue: previous['매출액'],
      sourceStatementId: current.__statements.income_statement
    }),
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'OPERATING_PROFIT_GROWTH',
      metricValue: growthRate(current['영업이익'], previous['영업이익']),
      previousValue: previous['영업이익'],
      sourceStatementId: current.__statements.income_statement
    }),
    buildMetric({
      stockId,
      fiscalYear,
      metricCode: 'ROE',
      metricValue: currentRoe,
      previousValue: previousRoe,
      sourceStatementId: current.__statements.income_statement
    })
  ];
}

function buildMetric({ stockId, fiscalYear, metricCode, metricValue, previousValue, sourceStatementId, unit = '%' }) {
  return {
    stock_id: stockId,
    metric_code: metricCode,
    fiscal_year: Number(fiscalYear),
    fiscal_quarter: 0,
    period_type: 'annual',
    metric_value: round(metricValue),
    unit,
    previous_value: round(previousValue),
    change_rate: metricCode.endsWith('_GROWTH')
      ? round(metricValue)
      : round(growthRate(metricValue, previousValue)),
    source_statement_id: sourceStatementId || null
  };
}

async function tryCollectValuationMetrics(stockId) {
  try {
    const result = await collectKiwoomStockBasicInfo({ stockId });
    const { per, pbr } = result.data;
    const skippedMetrics = [];

    if (!isFiniteNumber(per)) {
      skippedMetrics.push({ metricCode: 'PER', reason: '키움 기본정보 응답에 PER 값이 없어 계산하지 않음' });
    }

    if (!isFiniteNumber(pbr)) {
      skippedMetrics.push({ metricCode: 'PBR', reason: '키움 기본정보 응답에 PBR 값이 없어 계산하지 않음' });
    }

    return { per, pbr, skippedMetrics };
  } catch (error) {
    return {
      per: null,
      pbr: null,
      skippedMetrics: [
        { metricCode: 'PER', reason: `키움 기본정보를 불러오지 못해 계산하지 않음: ${error.message}` },
        { metricCode: 'PBR', reason: `키움 기본정보를 불러오지 못해 계산하지 않음: ${error.message}` }
      ]
    };
  }
}

function mapLineItems(items) {
  const mapped = {
    __statements: {}
  };

  for (const item of items) {
    if (!REQUIRED_ACCOUNTS.includes(item.account_name)) {
      continue;
    }

    mapped[item.account_name] = Number(item.amount);
    const statement = item.financial_statement_snapshots;
    if (statement?.statement_type) {
      mapped.__statements[statement.statement_type] = statement.statement_id;
    }
  }

  return mapped;
}

function ratio(numerator, denominator) {
  if (!isFiniteNumber(numerator) || !isFiniteNumber(denominator) || denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function growthRate(currentValue, previousValue) {
  if (!isFiniteNumber(currentValue) || !isFiniteNumber(previousValue) || previousValue === 0) {
    return null;
  }

  return ((currentValue - previousValue) / previousValue) * 100;
}

function round(value) {
  if (!isFiniteNumber(value)) {
    return null;
  }

  return Math.round(value * 1_000_000) / 1_000_000;
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}
