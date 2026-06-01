import {
  createAnalysisEvidence,
  deleteAnalysisEvidences,
  upsertAnalysisRun,
  upsertMetricAnalysisItem
} from '../repositories/aiAnalysisRepository.js';
import { findStockById } from '../repositories/stockRepository.js';
import { generateGeminiJson } from './geminiService.js';
import { runFinancialTrafficLightAnalysis } from './trafficLightAnalysisService.js';

const ANALYSIS_TYPE = 'financial';
const PROMPT_VERSION = 'llm-financial-v1';
const DEFAULT_MODEL = 'gemini-3-flash-preview';

export async function generateAndSaveFinancialLlmExplanation({
  stockId,
  fiscalYear,
  periodType = 'annual',
  fiscalQuarter = 0,
  userId = null,
  model = DEFAULT_MODEL
}) {
  const stock = await findStockById(stockId);
  if (!stock) {
    throw Object.assign(new Error(`Stock not found: ${stockId}`), { statusCode: 404 });
  }

  const ruleResult = await runFinancialTrafficLightAnalysis({
    stockId,
    fiscalYear,
    periodType,
    fiscalQuarter,
    userId
  });

  const prompt = buildPrompt({ stock, ruleResult });
  const llmResult = await generateExplanationWithFallback({ prompt, model, ruleResult });
  const explanation = normalizeExplanation(llmResult.json, ruleResult);

  const analysisRun = await upsertAnalysisRun({
    user_id: userId,
    stock_id: stockId,
    setting_id: null,
    analysis_type: ANALYSIS_TYPE,
    overall_signal: ruleResult.analysis.overall_signal,
    overall_score: Number(ruleResult.analysis.overall_score),
    summary_text: explanation.summary_text,
    reason_text: explanation.reason_text,
    caution_text: explanation.caution_text,
    source_period: ruleResult.analysis.source_period,
    source_data_hash: ruleResult.analysis.source_data_hash,
    model_name: llmResult.model,
    prompt_version: PROMPT_VERSION,
    expires_at: ruleResult.analysis.expires_at
  });

  const savedItems = [];
  for (const ruleItem of ruleResult.items) {
    const llmItem = explanation.metrics.find((item) => item.metric_code === ruleItem.metric_code) || {};

    savedItems.push(await upsertMetricAnalysisItem({
      analysis_id: analysisRun.analysis_id,
      metric_code: ruleItem.metric_code,
      metric_value: Number(ruleItem.metric_value),
      industry_avg_value: nullableNumber(ruleItem.industry_avg_value),
      previous_value: nullableNumber(ruleItem.previous_value),
      signal: ruleItem.signal,
      score: Number(ruleItem.score),
      reason_text: llmItem.reason_text || ruleItem.reason_text,
      beginner_explanation: llmItem.beginner_explanation || ruleItem.beginner_explanation,
      check_point_text: llmItem.check_point_text || ruleItem.check_point_text
    }));
  }

  await deleteAnalysisEvidences(analysisRun.analysis_id);
  const evidences = [];
  for (const evidence of ruleResult.evidences) {
    evidences.push(await createAnalysisEvidence({
      analysis_id: analysisRun.analysis_id,
      evidence_type: evidence.evidence_type,
      reference_table: evidence.reference_table,
      reference_id: evidence.reference_id,
      evidence_text: evidence.evidence_text,
      importance_score: nullableNumber(evidence.importance_score)
    }));
  }

  return {
    analysis: analysisRun,
    ruleAnalysisId: ruleResult.analysis.analysis_id,
    llm: {
      model: llmResult.model,
      finishReason: llmResult.finishReason,
      usageMetadata: llmResult.usageMetadata,
      fallback: llmResult.fallback,
      error: llmResult.error
    },
    savedItemCount: savedItems.length,
    savedEvidenceCount: evidences.length,
    items: savedItems,
    evidences
  };
}

async function generateExplanationWithFallback({ prompt, model, ruleResult }) {
  try {
    const llmResult = await generateGeminiJson({ prompt, model });
    return {
      ...llmResult,
      fallback: false,
      error: null
    };
  } catch (error) {
    return {
      model: 'rules-v1-fallback',
      json: buildFallbackExplanation(ruleResult),
      finishReason: null,
      usageMetadata: null,
      fallback: true,
      error: error.message
    };
  }
}

function buildFallbackExplanation(ruleResult) {
  return {
    summary_text: ruleResult.analysis.summary_text,
    reason_text: ruleResult.analysis.reason_text,
    caution_text: ruleResult.analysis.caution_text,
    metrics: ruleResult.items.map((item) => ({
      metric_code: item.metric_code,
      reason_text: item.reason_text,
      beginner_explanation: item.beginner_explanation,
      check_point_text: item.check_point_text
    }))
  };
}

function buildPrompt({ stock, ruleResult }) {
  const stockName = stock.company_name_ko || stock.ticker || stock.stock_code;
  const metricRows = ruleResult.items.map((item) => ({
    metric_code: item.metric_code,
    metric_value: Number(item.metric_value),
    previous_value: nullableNumber(item.previous_value),
    signal: item.signal,
    score: Number(item.score),
    rule_reason: item.reason_text,
    rule_beginner_explanation: item.beginner_explanation,
    rule_check_point: item.check_point_text
  }));

  return [
    '너는 초보 투자자를 위한 재무제표 해설 도우미다.',
    '절대 매수, 매도, 보유 추천을 하지 않는다.',
    '수익률 보장, 목표가, 근거 없는 전망, 과도한 단정 표현을 쓰지 않는다.',
    '이미 계산된 규칙 기반 신호는 바꾸지 말고, 쉬운 한국어 설명만 작성한다.',
    '응답은 반드시 JSON 객체 하나만 반환한다.',
    '',
    'JSON 스키마:',
    '{',
    '  "summary_text": "80자 이내의 초보자용 종합 요약",',
    '  "reason_text": "핵심 판단 이유 2~3문장",',
    '  "caution_text": "주의할 점 1~2문장. 매수/매도 추천이 아니라는 문장 포함",',
    '  "metrics": [',
    '    {',
    '      "metric_code": "DEBT_RATIO",',
    '      "reason_text": "판단 이유 1문장",',
    '      "beginner_explanation": "초보자용 쉬운 설명 1~2문장",',
    '      "check_point_text": "추가 확인 포인트 1문장"',
    '    }',
    '  ]',
    '}',
    '',
    '분석 대상:',
    JSON.stringify({
      stock: {
        stock_code: stock.stock_code,
        ticker: stock.ticker,
        company_name_ko: stockName,
        market: stock.market,
        industry_name: stock.industry_name
      },
      source_period: ruleResult.analysis.source_period,
      overall_signal: ruleResult.analysis.overall_signal,
      overall_score: Number(ruleResult.analysis.overall_score),
      metrics: metricRows
    }, null, 2)
  ].join('\n');
}

function normalizeExplanation(json, ruleResult) {
  const metrics = Array.isArray(json?.metrics) ? json.metrics : [];

  return {
    summary_text: requireText(json?.summary_text, ruleResult.analysis.summary_text),
    reason_text: requireText(json?.reason_text, ruleResult.analysis.reason_text),
    caution_text: ensureNoRecommendationNotice(requireText(json?.caution_text, ruleResult.analysis.caution_text)),
    metrics: metrics
      .filter((item) => typeof item?.metric_code === 'string')
      .map((item) => ({
        metric_code: item.metric_code,
        reason_text: textOrNull(item.reason_text),
        beginner_explanation: textOrNull(item.beginner_explanation),
        check_point_text: textOrNull(item.check_point_text)
      }))
  };
}

function requireText(value, fallback) {
  return textOrNull(value) || fallback || '재무 지표를 기준으로 한 초보자용 설명입니다.';
}

function textOrNull(value) {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function ensureNoRecommendationNotice(text) {
  if (text.includes('매수') || text.includes('매도')) {
    return text;
  }

  return `${text} 이 내용은 매수/매도 추천이 아니라 재무 지표 해석입니다.`;
}

function nullableNumber(value) {
  if (value === null || value === undefined) {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}
