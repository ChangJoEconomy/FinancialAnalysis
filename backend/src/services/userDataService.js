import {
  addFavoriteStock,
  listChatMessagesForOwnedSession,
  listChatSessions,
  listFavoriteStocks,
  listSearchHistories,
  recordSearchHistory,
  removeFavoriteStock,
  updateFavoriteStock
} from '../repositories/userScopedRepository.js';
import {
  ANALYSIS_PRESETS,
  clearDefaultAnalysisSettings,
  ensureAnalysisPreset,
  findAnalysisSettingByIdForUser,
  findAnalysisSettingByRiskType,
  findDefaultAnalysisSetting,
  listAnalysisSettings,
  updateAnalysisSetting
} from '../repositories/analysisSettingsRepository.js';

export async function getFavoriteStocks(authContext) {
  return listFavoriteStocks(authContext.userId);
}

export async function createFavoriteStock(authContext, payload) {
  return addFavoriteStock(authContext.userId, payload);
}

export async function deleteFavoriteStock(authContext, favoriteId) {
  return removeFavoriteStock(authContext.userId, favoriteId);
}

export async function patchFavoriteStock(authContext, favoriteId, payload) {
  return updateFavoriteStock(authContext.userId, favoriteId, payload);
}

export async function getSearchHistories(authContext, limit) {
  return listSearchHistories(authContext.userId, limit);
}

export async function createSearchHistory(authContext, payload) {
  return recordSearchHistory(authContext.userId, payload);
}

export async function getChatSessions(authContext, limit) {
  return listChatSessions(authContext.userId, limit);
}

export async function getChatMessages(authContext, chatSessionId) {
  return listChatMessagesForOwnedSession(authContext.userId, chatSessionId);
}

export async function getAnalysisSettings(authContext) {
  const settings = await ensureDefaultAnalysisSettings(authContext.userId);

  return {
    defaultSetting: settings.find((setting) => setting.is_default) || null,
    settings
  };
}

export async function updateAnalysisSettings(authContext, payload) {
  const settings = await ensureDefaultAnalysisSettings(authContext.userId);
  const target = await resolveTargetSetting(authContext.userId, payload, settings);
  const weights = payload.weights ? validateWeights(payload.weights) : undefined;

  if (payload.isDefault !== false) {
    await clearDefaultAnalysisSettings(authContext.userId, target.setting_id);
  }

  const updated = await updateAnalysisSetting(target.setting_id, {
    settingName: payload.settingName,
    weights,
    isDefault: payload.isDefault === false ? target.is_default : true
  });

  return {
    defaultSetting: updated.is_default ? updated : await findDefaultAnalysisSetting(authContext.userId),
    settings: await listAnalysisSettings(authContext.userId),
    updated
  };
}

export async function ensureDefaultAnalysisSettings(userId) {
  let settings = await listAnalysisSettings(userId);
  const hasDefault = settings.some((setting) => setting.is_default);

  for (const riskType of Object.keys(ANALYSIS_PRESETS)) {
    const exists = settings.some((setting) => setting.risk_type === riskType);
    if (!exists) {
      await ensureAnalysisPreset(userId, riskType, {
        isDefault: !hasDefault && riskType === 'balanced'
      });
    }
  }

  settings = await listAnalysisSettings(userId);
  if (!settings.some((setting) => setting.is_default)) {
    const balanced = settings.find((setting) => setting.risk_type === 'balanced') || settings[0];
    await updateAnalysisSetting(balanced.setting_id, { isDefault: true });
    settings = await listAnalysisSettings(userId);
  }

  return settings;
}

async function resolveTargetSetting(userId, payload, existingSettings) {
  if (payload.settingId) {
    const setting = await findAnalysisSettingByIdForUser(userId, payload.settingId);
    if (!setting) {
      throw Object.assign(new Error('Analysis setting not found.'), { statusCode: 404 });
    }

    return setting;
  }

  const riskType = payload.riskType || 'balanced';
  validateRiskType(riskType);

  return (
    existingSettings.find((setting) => setting.risk_type === riskType) ||
    await findAnalysisSettingByRiskType(userId, riskType) ||
    await ensureAnalysisPreset(userId, riskType)
  );
}

function validateRiskType(riskType) {
  if (!ANALYSIS_PRESETS[riskType]) {
    throw Object.assign(new Error('riskType must be conservative, balanced, or growth.'), { statusCode: 400 });
  }
}

function validateWeights(weights) {
  const allowedKeys = ['stability', 'growth', 'profitability', 'valuation', 'news'];
  const normalized = {};

  for (const [key, value] of Object.entries(weights)) {
    if (!allowedKeys.includes(key)) {
      throw Object.assign(new Error(`Unsupported weight: ${key}`), { statusCode: 400 });
    }

    const numberValue = Number(value);
    if (!Number.isFinite(numberValue) || numberValue < 0) {
      throw Object.assign(new Error(`${key} weight must be a non-negative number.`), { statusCode: 400 });
    }

    normalized[key] = Math.round(numberValue * 100) / 100;
  }

  return normalized;
}
