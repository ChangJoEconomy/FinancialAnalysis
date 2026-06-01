import { requestSupabaseRest } from './supabaseRestRepository.js';

export const ANALYSIS_SETTING_SELECT = [
  'setting_id',
  'user_id',
  'setting_name',
  'risk_type',
  'stability_weight',
  'growth_weight',
  'profitability_weight',
  'valuation_weight',
  'news_weight',
  'is_default',
  'created_at',
  'updated_at'
].join(',');

export const ANALYSIS_PRESETS = {
  conservative: {
    settingName: '안정성 중심',
    riskType: 'conservative',
    weights: {
      stability: 0.4,
      growth: 0.15,
      profitability: 0.25,
      valuation: 0.15,
      news: 0.05
    }
  },
  balanced: {
    settingName: '균형 분석',
    riskType: 'balanced',
    weights: {
      stability: 0.25,
      growth: 0.25,
      profitability: 0.25,
      valuation: 0.2,
      news: 0.05
    }
  },
  growth: {
    settingName: '성장성 중심',
    riskType: 'growth',
    weights: {
      stability: 0.15,
      growth: 0.4,
      profitability: 0.25,
      valuation: 0.15,
      news: 0.05
    }
  }
};

export async function listAnalysisSettings(userId) {
  return requestSupabaseRest(
    `user_analysis_settings?select=${ANALYSIS_SETTING_SELECT}` +
      `&user_id=eq.${Number(userId)}` +
      '&order=setting_id.asc'
  );
}

export async function findAnalysisSettingByRiskType(userId, riskType) {
  const rows = await requestSupabaseRest(
    `user_analysis_settings?select=${ANALYSIS_SETTING_SELECT}` +
      `&user_id=eq.${Number(userId)}` +
      `&risk_type=eq.${encodeURIComponent(riskType)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function findAnalysisSettingByIdForUser(userId, settingId) {
  const rows = await requestSupabaseRest(
    `user_analysis_settings?select=${ANALYSIS_SETTING_SELECT}` +
      `&user_id=eq.${Number(userId)}` +
      `&setting_id=eq.${Number(settingId)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function findDefaultAnalysisSetting(userId) {
  const rows = await requestSupabaseRest(
    `user_analysis_settings?select=${ANALYSIS_SETTING_SELECT}` +
      `&user_id=eq.${Number(userId)}` +
      '&is_default=eq.true' +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function createAnalysisSetting(userId, preset, { isDefault = false } = {}) {
  const rows = await requestSupabaseRest('user_analysis_settings', {
    method: 'POST',
    prefer: 'return=representation',
    body: toDbSetting(userId, preset, { isDefault })
  });

  return rows[0];
}

export async function updateAnalysisSetting(settingId, patch) {
  const rows = await requestSupabaseRest(`user_analysis_settings?setting_id=eq.${Number(settingId)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: normalizePatch(patch)
  });

  return rows[0];
}

export async function clearDefaultAnalysisSettings(userId, exceptSettingId = null) {
  const exceptFilter = exceptSettingId ? `&setting_id=neq.${Number(exceptSettingId)}` : '';

  await requestSupabaseRest(
    `user_analysis_settings?user_id=eq.${Number(userId)}&is_default=eq.true${exceptFilter}`,
    {
      method: 'PATCH',
      body: { is_default: false }
    }
  );
}

export async function ensureAnalysisPreset(userId, riskType, { isDefault = false } = {}) {
  const preset = ANALYSIS_PRESETS[riskType];
  if (!preset) {
    throw badRequest(`Unsupported riskType: ${riskType}`);
  }

  const existing = await findAnalysisSettingByRiskType(userId, riskType);
  if (existing) {
    return existing;
  }

  return createAnalysisSetting(userId, preset, { isDefault });
}

function toDbSetting(userId, preset, { isDefault = false } = {}) {
  return {
    user_id: Number(userId),
    setting_name: preset.settingName,
    risk_type: preset.riskType,
    stability_weight: preset.weights.stability,
    growth_weight: preset.weights.growth,
    profitability_weight: preset.weights.profitability,
    valuation_weight: preset.weights.valuation,
    news_weight: preset.weights.news,
    is_default: isDefault
  };
}

function normalizePatch(patch) {
  const normalized = {};

  if (patch.settingName !== undefined) {
    normalized.setting_name = patch.settingName;
  }

  if (patch.riskType !== undefined) {
    normalized.risk_type = patch.riskType;
  }

  if (patch.isDefault !== undefined) {
    normalized.is_default = Boolean(patch.isDefault);
  }

  const weights = patch.weights || {};
  if (weights.stability !== undefined) {
    normalized.stability_weight = Number(weights.stability);
  }
  if (weights.growth !== undefined) {
    normalized.growth_weight = Number(weights.growth);
  }
  if (weights.profitability !== undefined) {
    normalized.profitability_weight = Number(weights.profitability);
  }
  if (weights.valuation !== undefined) {
    normalized.valuation_weight = Number(weights.valuation);
  }
  if (weights.news !== undefined) {
    normalized.news_weight = Number(weights.news);
  }

  return normalized;
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
