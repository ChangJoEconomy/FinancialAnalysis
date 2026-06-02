import {
  findLatestAnalysisRun,
  listAnalysisEvidences,
  listMetricAnalysisItems
} from '../repositories/aiAnalysisRepository.js';
import {
  findAnalysisSettingByIdForUser,
  findDefaultAnalysisSetting
} from '../repositories/analysisSettingsRepository.js';
import {
  listFinancialLineItemsByStockYear,
  listFinancialMetricValues,
  listFinancialStatementSnapshots
} from '../repositories/financialStatementRepository.js';
import { findStockById } from '../repositories/stockRepository.js';
import { calculateAndSaveFinancialMetrics } from './financialMetricService.js';
import { generateAndSaveFinancialLlmExplanation } from './llmExplanationService.js';
import { ensureDefaultAnalysisSettings } from './userDataService.js';
import { getCacheTtlMs } from './cachePolicy.js';

const LLM_PROMPT_VERSION = 'llm-financial-v1';
const ANALYSIS_TYPE = 'financial';

export async function getStockDetail(stockId) {
  return requireStock(stockId);
}

export async function getStockSummary({ stockId, authContext = null }) {
  const stock = await requireStock(stockId);
  const setting = await resolveAnalysisSetting({ authContext });
  let analysis = await findLatestAnalysisRun({
    stockId,
    analysisType: ANALYSIS_TYPE,
    promptVersion: LLM_PROMPT_VERSION,
    settingId: setting?.setting_id || null
  });

  if (!analysis && setting) {
    analysis = await findLatestAnalysisRun({
      stockId,
      analysisType: ANALYSIS_TYPE,
      promptVersion: LLM_PROMPT_VERSION
    });
  }

  return buildSummaryResponse({ stock, analysis, setting });
}

export async function analyzeStock({
  stockId,
  authContext = null,
  payload = {}
}) {
  const stock = await requireStock(stockId);
  const fiscalYear = parseFiscalYear(payload.fiscalYear);
  const periodType = payload.periodType || 'annual';
  const fiscalQuarter = parseFiscalQuarter(payload.fiscalQuarter);
  const setting = await resolveAnalysisSetting({
    authContext,
    settingId: payload.settingId
  });

  if (periodType !== 'annual') {
    throw badRequest('Only annual analysis is supported for the current MVP.');
  }

  const cachedAnalysis = await findLatestAnalysisRun({
    stockId,
    analysisType: ANALYSIS_TYPE,
    promptVersion: LLM_PROMPT_VERSION,
    settingId: setting?.setting_id || null,
    freshOnly: true,
    maxAgeMs: getCacheTtlMs('financial_analysis')
  });

  if (cachedAnalysis && !payload.forceRefresh) {
    return {
      cached: true,
      pipeline: null,
      ...(await buildSummaryResponse({ stock, analysis: cachedAnalysis, setting }))
    };
  }

  const metrics = await calculateAndSaveFinancialMetrics({
    stockId,
    fiscalYear,
    reportType: periodType
  });

  const explanation = await generateAndSaveFinancialLlmExplanation({
    stockId,
    fiscalYear,
    periodType,
    fiscalQuarter,
    userId: authContext?.userId || null,
    settingId: setting?.setting_id || null
  });

  return {
    cached: false,
    pipeline: {
      fiscalYear,
      financialMetricCount: metrics.savedCount,
      skippedMetrics: metrics.skippedMetrics,
      ruleAnalysisId: explanation.ruleAnalysisId,
      llmFallback: explanation.llm.fallback
    },
    ...(await buildSummaryResponse({
      stock,
      analysis: explanation.analysis,
      setting
    }))
  };
}

export async function getStockFinancials({ stockId, fiscalYear }) {
  const stock = await requireStock(stockId);
  const year = parseFiscalYear(fiscalYear);
  const [snapshots, lineItems, metrics] = await Promise.all([
    listFinancialStatementSnapshots({ stockId, fiscalYear: year }),
    listFinancialLineItemsByStockYear({ stockId, fiscalYear: year }),
    listFinancialMetricValues({ stockId, fiscalYear: year })
  ]);

  return {
    stock,
    fiscalYear: year,
    snapshots,
    lineItems,
    metrics
  };
}

async function buildSummaryResponse({ stock, analysis, setting }) {
  if (!analysis) {
    return {
      stock,
      setting,
      analysis: null,
      metrics: [],
      evidences: []
    };
  }

  const [metrics, evidences] = await Promise.all([
    listMetricAnalysisItems(analysis.analysis_id),
    listAnalysisEvidences(analysis.analysis_id)
  ]);

  return {
    stock,
    setting,
    analysis,
    metrics,
    evidences
  };
}

async function resolveAnalysisSetting({ authContext, settingId = null }) {
  if (!authContext) {
    if (settingId) {
      throw Object.assign(new Error('Login is required to use a personal analysis setting.'), { statusCode: 401 });
    }

    return null;
  }

  await ensureDefaultAnalysisSettings(authContext.userId);

  if (settingId) {
    const setting = await findAnalysisSettingByIdForUser(authContext.userId, settingId);
    if (!setting) {
      throw Object.assign(new Error('Analysis setting not found.'), { statusCode: 404 });
    }

    return setting;
  }

  return findDefaultAnalysisSetting(authContext.userId);
}

async function requireStock(stockId) {
  const normalizedStockId = Number(stockId);
  if (!Number.isInteger(normalizedStockId) || normalizedStockId <= 0) {
    throw badRequest('stockId must be a positive integer.');
  }

  const stock = await findStockById(normalizedStockId);
  if (!stock) {
    throw Object.assign(new Error('Stock not found.'), { statusCode: 404 });
  }

  return stock;
}

function parseFiscalYear(value = 2024) {
  const fiscalYear = Number(value || 2024);
  if (!Number.isInteger(fiscalYear) || fiscalYear < 1900 || fiscalYear > 2200) {
    throw badRequest('fiscalYear must be an integer between 1900 and 2200.');
  }

  return fiscalYear;
}

function parseFiscalQuarter(value = 0) {
  const fiscalQuarter = Number(value || 0);
  if (!Number.isInteger(fiscalQuarter) || fiscalQuarter < 0 || fiscalQuarter > 4) {
    throw badRequest('fiscalQuarter must be an integer between 0 and 4.');
  }

  return fiscalQuarter;
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
