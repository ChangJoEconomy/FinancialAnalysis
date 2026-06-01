import { createHash } from 'node:crypto';
import {
  findAnalysisSettingByIdForUser,
  findDefaultAnalysisSetting
} from '../repositories/analysisSettingsRepository.js';
import { listFinancialMetricValues } from '../repositories/financialStatementRepository.js';
import { findStockById } from '../repositories/stockRepository.js';
import {
  createAnalysisEvidence,
  deleteAnalysisEvidences,
  upsertAnalysisRun,
  upsertMetricAnalysisItem
} from '../repositories/aiAnalysisRepository.js';

const PROMPT_VERSION = 'rules-financial-v1';
const MODEL_NAME = 'rules-v1';
const ANALYSIS_TYPE = 'financial';

const METRIC_RULES = {
  DEBT_RATIO: {
    label: '부채비율',
    category: 'stability',
    unit: '%',
    evaluate: (value) => {
      if (value < 100) {
        return {
          signal: 'green',
          score: 90,
          reason: `부채비율이 ${formatPercent(value)}로 100% 미만입니다.`,
          explanation: '자본보다 부채가 적은 편이라 재무 안정성 측면에서 부담이 낮게 보입니다.',
          checkPoint: '단기차입금과 만기 구조도 함께 확인하면 더 좋습니다.'
        };
      }

      if (value < 200) {
        return {
          signal: 'orange',
          score: 60,
          reason: `부채비율이 ${formatPercent(value)}로 100% 이상 200% 미만입니다.`,
          explanation: '부채 부담이 아주 높지는 않지만, 이자비용이나 현금흐름을 같이 볼 필요가 있습니다.',
          checkPoint: '영업현금흐름으로 부채를 감당할 수 있는지 확인하세요.'
        };
      }

      return {
        signal: 'red',
        score: 30,
        reason: `부채비율이 ${formatPercent(value)}로 200% 이상입니다.`,
        explanation: '자본에 비해 부채가 큰 편이라 재무 안정성에 주의가 필요합니다.',
        checkPoint: '차입금 증가 원인과 이자보상 능력을 확인하세요.'
      };
    }
  },
  OPERATING_MARGIN: {
    label: '영업이익률',
    category: 'profitability',
    unit: '%',
    evaluate: (value) => {
      if (value >= 10) {
        return {
          signal: 'green',
          score: 85,
          reason: `영업이익률이 ${formatPercent(value)}로 10% 이상입니다.`,
          explanation: '매출에서 본업 이익으로 남는 비율이 양호합니다.',
          checkPoint: '일회성 이익이 아니라 본업 수익성이 유지되는지 확인하세요.'
        };
      }

      if (value >= 3) {
        return {
          signal: 'orange',
          score: 60,
          reason: `영업이익률이 ${formatPercent(value)}로 3% 이상 10% 미만입니다.`,
          explanation: '본업에서 이익은 내고 있지만 수익성이 아주 높다고 보기는 어렵습니다.',
          checkPoint: '원가율, 판매관리비, 업황 변화를 함께 확인하세요.'
        };
      }

      return {
        signal: 'red',
        score: 30,
        reason: `영업이익률이 ${formatPercent(value)}로 3% 미만입니다.`,
        explanation: '매출 대비 본업 이익이 낮아 수익성에 주의가 필요합니다.',
        checkPoint: '적자 여부와 다음 기간의 이익 회복 가능성을 확인하세요.'
      };
    }
  },
  REVENUE_GROWTH: {
    label: '매출 성장률',
    category: 'growth',
    unit: '%',
    evaluate: evaluateGrowthMetric('매출 성장률', '매출이 전년보다 뚜렷하게 증가했습니다.', '매출은 증가했지만 성장 폭은 제한적입니다.', '매출이 전년보다 감소했습니다.')
  },
  OPERATING_PROFIT_GROWTH: {
    label: '영업이익 성장률',
    category: 'growth',
    unit: '%',
    evaluate: evaluateGrowthMetric('영업이익 성장률', '본업 이익이 전년보다 크게 개선됐습니다.', '본업 이익은 증가했지만 증가 폭은 제한적입니다.', '본업 이익이 전년보다 줄었습니다.')
  },
  ROE: {
    label: 'ROE',
    category: 'profitability',
    unit: '%',
    evaluate: (value) => {
      if (value >= 10) {
        return {
          signal: 'green',
          score: 80,
          reason: `ROE가 ${formatPercent(value)}로 10% 이상입니다.`,
          explanation: '자기자본을 활용해 이익을 내는 효율이 양호합니다.',
          checkPoint: '높은 ROE가 과도한 부채 때문은 아닌지 함께 확인하세요.'
        };
      }

      if (value >= 5) {
        return {
          signal: 'orange',
          score: 60,
          reason: `ROE가 ${formatPercent(value)}로 5% 이상 10% 미만입니다.`,
          explanation: '자본 효율은 나쁘지 않지만 강하다고 보기는 어렵습니다.',
          checkPoint: '순이익률과 자본 규모 변화가 ROE에 어떤 영향을 줬는지 확인하세요.'
        };
      }

      return {
        signal: 'red',
        score: 35,
        reason: `ROE가 ${formatPercent(value)}로 5% 미만입니다.`,
        explanation: '자본 대비 이익 창출력이 낮아 수익성 개선 여부를 봐야 합니다.',
        checkPoint: '순이익 감소가 일회성인지 반복되는 흐름인지 확인하세요.'
      };
    }
  }
};

export async function runFinancialTrafficLightAnalysis({
  stockId,
  fiscalYear,
  periodType = 'annual',
  fiscalQuarter = 0,
  userId = null,
  settingId = null,
  analysisSetting = null
}) {
  const stock = await findStockById(stockId);
  if (!stock) {
    throw Object.assign(new Error(`Stock not found: ${stockId}`), { statusCode: 404 });
  }

  const metricValues = await listFinancialMetricValues({ stockId, fiscalYear });
  const targetMetrics = metricValues
    .filter((metric) => metric.period_type === periodType && Number(metric.fiscal_quarter) === Number(fiscalQuarter))
    .filter((metric) => METRIC_RULES[metric.metric_code]);

  if (targetMetrics.length === 0) {
    throw Object.assign(new Error('No financial metric values are available for traffic-light analysis.'), {
      statusCode: 404,
      details: { stockId, fiscalYear, periodType, fiscalQuarter }
    });
  }

  const analyzedItems = targetMetrics.map(analyzeMetric);
  const resolvedSetting = analysisSetting || await resolveAnalysisSetting({ userId, settingId });
  const overallScore = round(calculateOverallScore(analyzedItems, resolvedSetting));
  const overallSignal = signalFromScore(overallScore);
  const sourcePeriod = `${fiscalYear} ${periodType}${fiscalQuarter ? ` Q${fiscalQuarter}` : ''}`;
  const sourceDataHash = hashAnalysisInput({ metricValues: targetMetrics, analysisSetting: resolvedSetting });
  const stockName = stock.company_name_ko || stock.ticker || stock.stock_code;
  const summary = buildSummary({ stockName, sourcePeriod, overallSignal, overallScore, analyzedItems, analysisSetting: resolvedSetting });

  const analysisRun = await upsertAnalysisRun({
    user_id: userId,
    stock_id: stockId,
    setting_id: resolvedSetting?.setting_id || null,
    analysis_type: ANALYSIS_TYPE,
    overall_signal: overallSignal,
    overall_score: overallScore,
    summary_text: summary.summaryText,
    reason_text: summary.reasonText,
    caution_text: summary.cautionText,
    source_period: sourcePeriod,
    source_data_hash: sourceDataHash,
    model_name: MODEL_NAME,
    prompt_version: PROMPT_VERSION,
    expires_at: addDays(new Date(), 30).toISOString()
  });

  const savedItems = [];
  for (const item of analyzedItems) {
    savedItems.push(await upsertMetricAnalysisItem({
      analysis_id: analysisRun.analysis_id,
      metric_code: item.metricCode,
      metric_value: item.metricValue,
      industry_avg_value: item.industryAvgValue,
      previous_value: item.previousValue,
      signal: item.signal,
      score: item.score,
      reason_text: item.reasonText,
      beginner_explanation: item.beginnerExplanation,
      check_point_text: item.checkPointText
    }));
  }

  await deleteAnalysisEvidences(analysisRun.analysis_id);
  const evidences = [];
  for (const item of analyzedItems) {
    evidences.push(await createAnalysisEvidence({
      analysis_id: analysisRun.analysis_id,
      evidence_type: 'financial_metric',
      reference_table: 'financial_metric_values',
      reference_id: String(item.metricValueId),
      evidence_text: `${item.label}: ${formatPercent(item.metricValue)} -> ${item.signal}`,
      importance_score: item.score
    }));
  }

  return {
    analysis: analysisRun,
    savedItemCount: savedItems.length,
    savedEvidenceCount: evidences.length,
    items: savedItems,
    evidences
  };
}

function analyzeMetric(metric) {
  const rule = METRIC_RULES[metric.metric_code];
  const metricValue = Number(metric.metric_value);
  const result = rule.evaluate(metricValue);

  return {
    metricValueId: metric.metric_value_id,
    metricCode: metric.metric_code,
    label: rule.label,
    category: rule.category,
    metricValue: round(metricValue),
    industryAvgValue: nullableNumber(metric.industry_avg_value),
    previousValue: nullableNumber(metric.previous_value),
    signal: result.signal,
    score: result.score,
    reasonText: result.reason,
    beginnerExplanation: result.explanation,
    checkPointText: result.checkPoint
  };
}

function evaluateGrowthMetric(metricName, greenExplanation, orangeExplanation, redExplanation) {
  return (value) => {
    if (value >= 10) {
      return {
        signal: 'green',
        score: 85,
        reason: `${metricName}이 ${formatPercent(value)}로 10% 이상입니다.`,
        explanation: greenExplanation,
        checkPoint: '성장이 일회성인지, 다음 기간에도 이어질 수 있는지 확인하세요.'
      };
    }

    if (value >= 0) {
      return {
        signal: 'orange',
        score: 60,
        reason: `${metricName}이 ${formatPercent(value)}로 0% 이상 10% 미만입니다.`,
        explanation: orangeExplanation,
        checkPoint: '업종 성장률과 회사의 시장점유율 변화를 함께 확인하세요.'
      };
    }

    return {
      signal: 'red',
      score: 30,
      reason: `${metricName}이 ${formatPercent(value)}로 0% 미만입니다.`,
      explanation: redExplanation,
      checkPoint: '감소 원인이 업황 부진인지 회사 경쟁력 약화인지 구분해야 합니다.'
    };
  };
}

function buildSummary({ stockName, sourcePeriod, overallSignal, overallScore, analyzedItems, analysisSetting }) {
  const greenCount = countSignal(analyzedItems, 'green');
  const orangeCount = countSignal(analyzedItems, 'orange');
  const redCount = countSignal(analyzedItems, 'red');
  const strongest = analyzedItems.reduce((best, item) => (item.score > best.score ? item : best), analyzedItems[0]);
  const weakest = analyzedItems.reduce((worst, item) => (item.score < worst.score ? item : worst), analyzedItems[0]);

  const settingText = analysisSetting
    ? ` ${analysisSetting.setting_name} 설정을 반영했습니다.`
    : '';

  return {
    summaryText: `${stockName} ${sourcePeriod} 재무 신호는 ${overallSignal}입니다. 분석 점수는 ${overallScore}점이며, green ${greenCount}개, orange ${orangeCount}개, red ${redCount}개입니다.${settingText}`,
    reasonText: `가장 긍정적인 지표는 ${strongest.label}이고, 가장 확인이 필요한 지표는 ${weakest.label}입니다. ${strongest.reasonText}`,
    cautionText: `${weakest.label}은 추가 확인이 필요합니다. ${weakest.checkPointText} 이 결과는 매수/매도 추천이 아니라 재무 지표 해석입니다.`
  };
}

async function resolveAnalysisSetting({ userId, settingId }) {
  if (!userId) {
    return null;
  }

  if (settingId) {
    const setting = await findAnalysisSettingByIdForUser(userId, settingId);
    if (!setting) {
      throw Object.assign(new Error('Analysis setting not found.'), { statusCode: 404 });
    }

    return setting;
  }

  return findDefaultAnalysisSetting(userId);
}

function calculateOverallScore(analyzedItems, analysisSetting) {
  if (!analysisSetting) {
    return average(analyzedItems.map((item) => item.score));
  }

  const categoryScores = new Map();
  for (const item of analyzedItems) {
    const scores = categoryScores.get(item.category) || [];
    scores.push(item.score);
    categoryScores.set(item.category, scores);
  }

  let weightedScoreSum = 0;
  let weightSum = 0;
  for (const [category, scores] of categoryScores.entries()) {
    const weight = getCategoryWeight(analysisSetting, category);
    if (weight <= 0) {
      continue;
    }

    weightedScoreSum += average(scores) * weight;
    weightSum += weight;
  }

  return weightSum > 0 ? weightedScoreSum / weightSum : average(analyzedItems.map((item) => item.score));
}

function getCategoryWeight(analysisSetting, category) {
  const key = `${category}_weight`;
  const weight = Number(analysisSetting[key]);
  return Number.isFinite(weight) ? weight : 0;
}

function signalFromScore(score) {
  if (score >= 75) {
    return 'green';
  }

  if (score >= 50) {
    return 'orange';
  }

  return 'red';
}

function hashAnalysisInput({ metricValues, analysisSetting }) {
  const payload = metricValues
    .map((metric) => ({
      metric_code: metric.metric_code,
      fiscal_year: metric.fiscal_year,
      fiscal_quarter: metric.fiscal_quarter,
      period_type: metric.period_type,
      metric_value: metric.metric_value,
      previous_value: metric.previous_value,
      change_rate: metric.change_rate
    }))
    .sort((a, b) => a.metric_code.localeCompare(b.metric_code));

  if (!analysisSetting) {
    return createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  }

  return createHash('sha256').update(JSON.stringify({
    metricValues: payload,
    analysisSetting: {
      setting_id: analysisSetting.setting_id,
      risk_type: analysisSetting.risk_type,
      stability_weight: analysisSetting.stability_weight,
      growth_weight: analysisSetting.growth_weight,
      profitability_weight: analysisSetting.profitability_weight,
      valuation_weight: analysisSetting.valuation_weight,
      news_weight: analysisSetting.news_weight
    }
  })).digest('hex');
}

function countSignal(items, signal) {
  return items.filter((item) => item.signal === signal).length;
}

function average(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));
  return finiteValues.reduce((sum, value) => sum + value, 0) / finiteValues.length;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function nullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? round(numberValue) : null;
}

function round(value) {
  if (!Number.isFinite(value)) {
    return null;
  }

  return Math.round(value * 1_000_000) / 1_000_000;
}

function formatPercent(value) {
  return `${round(value)}%`;
}
