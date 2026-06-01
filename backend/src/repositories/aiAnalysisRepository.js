import { requestSupabaseRest } from './supabaseRestRepository.js';

const ANALYSIS_RUN_SELECT = [
  'analysis_id',
  'user_id',
  'stock_id',
  'setting_id',
  'analysis_type',
  'overall_signal',
  'overall_score',
  'summary_text',
  'reason_text',
  'caution_text',
  'source_period',
  'source_data_hash',
  'model_name',
  'prompt_version',
  'created_at',
  'expires_at'
].join(',');

const METRIC_ANALYSIS_ITEM_SELECT = [
  'item_id',
  'analysis_id',
  'metric_code',
  'metric_value',
  'industry_avg_value',
  'previous_value',
  'signal',
  'score',
  'reason_text',
  'beginner_explanation',
  'check_point_text',
  'created_at'
].join(',');

const EVIDENCE_SELECT = [
  'evidence_id',
  'analysis_id',
  'evidence_type',
  'reference_table',
  'reference_id',
  'evidence_text',
  'importance_score',
  'created_at'
].join(',');

export async function findAnalysisRunBySource({ stockId, analysisType, sourceDataHash, promptVersion }) {
  const rows = await requestSupabaseRest(
    `ai_analysis_runs?select=${ANALYSIS_RUN_SELECT}` +
      `&stock_id=eq.${Number(stockId)}` +
      `&analysis_type=eq.${encodeURIComponent(analysisType)}` +
      `&source_data_hash=eq.${encodeURIComponent(sourceDataHash)}` +
      `&prompt_version=eq.${encodeURIComponent(promptVersion)}` +
      '&order=created_at.desc' +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function upsertAnalysisRun(run) {
  const existing = await findAnalysisRunBySource({
    stockId: run.stock_id,
    analysisType: run.analysis_type,
    sourceDataHash: run.source_data_hash,
    promptVersion: run.prompt_version
  });

  if (existing) {
    return updateAnalysisRun(existing.analysis_id, run);
  }

  return createAnalysisRun(run);
}

export async function createAnalysisRun(run) {
  const rows = await requestSupabaseRest('ai_analysis_runs', {
    method: 'POST',
    prefer: 'return=representation',
    body: run
  });

  return rows[0];
}

export async function updateAnalysisRun(analysisId, patch) {
  const rows = await requestSupabaseRest(`ai_analysis_runs?analysis_id=eq.${Number(analysisId)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      overall_signal: patch.overall_signal,
      overall_score: patch.overall_score,
      summary_text: patch.summary_text,
      reason_text: patch.reason_text,
      caution_text: patch.caution_text,
      source_period: patch.source_period,
      model_name: patch.model_name,
      expires_at: patch.expires_at
    }
  });

  return rows[0];
}

export async function findMetricAnalysisItem({ analysisId, metricCode }) {
  const rows = await requestSupabaseRest(
    `ai_metric_analysis_items?select=${METRIC_ANALYSIS_ITEM_SELECT}` +
      `&analysis_id=eq.${Number(analysisId)}` +
      `&metric_code=eq.${encodeURIComponent(metricCode)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function upsertMetricAnalysisItem(item) {
  const existing = await findMetricAnalysisItem({
    analysisId: item.analysis_id,
    metricCode: item.metric_code
  });

  if (existing) {
    return updateMetricAnalysisItem(existing.item_id, item);
  }

  return createMetricAnalysisItem(item);
}

export async function createMetricAnalysisItem(item) {
  const rows = await requestSupabaseRest('ai_metric_analysis_items', {
    method: 'POST',
    prefer: 'return=representation',
    body: item
  });

  return rows[0];
}

export async function updateMetricAnalysisItem(itemId, patch) {
  const rows = await requestSupabaseRest(`ai_metric_analysis_items?item_id=eq.${Number(itemId)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      metric_value: patch.metric_value,
      industry_avg_value: patch.industry_avg_value ?? null,
      previous_value: patch.previous_value ?? null,
      signal: patch.signal,
      score: patch.score,
      reason_text: patch.reason_text,
      beginner_explanation: patch.beginner_explanation,
      check_point_text: patch.check_point_text
    }
  });

  return rows[0];
}

export async function deleteAnalysisEvidences(analysisId) {
  await requestSupabaseRest(`ai_analysis_evidences?analysis_id=eq.${Number(analysisId)}`, {
    method: 'DELETE'
  });
}

export async function createAnalysisEvidence(evidence) {
  const rows = await requestSupabaseRest('ai_analysis_evidences', {
    method: 'POST',
    prefer: 'return=representation',
    body: evidence
  });

  return rows[0];
}

export async function listMetricAnalysisItems(analysisId) {
  return requestSupabaseRest(
    `ai_metric_analysis_items?select=${METRIC_ANALYSIS_ITEM_SELECT}` +
      `&analysis_id=eq.${Number(analysisId)}` +
      '&order=metric_code.asc'
  );
}

export async function listAnalysisEvidences(analysisId) {
  return requestSupabaseRest(
    `ai_analysis_evidences?select=${EVIDENCE_SELECT}` +
      `&analysis_id=eq.${Number(analysisId)}` +
      '&order=importance_score.desc'
  );
}
