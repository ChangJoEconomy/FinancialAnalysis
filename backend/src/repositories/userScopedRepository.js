import { requestSupabaseRest } from './supabaseRestRepository.js';

const FAVORITE_SELECT = [
  'favorite_id',
  'user_id',
  'stock_id',
  'memo',
  'display_order',
  'created_at',
  'stocks(stock_code,ticker,company_name_ko,company_name_en,market)'
].join(',');

const SEARCH_HISTORY_SELECT = [
  'search_id',
  'user_id',
  'query_text',
  'stock_id',
  'result_count',
  'searched_at',
  'stocks(stock_code,ticker,company_name_ko,market)'
].join(',');

const CHAT_SESSION_SELECT = [
  'chat_session_id',
  'user_id',
  'stock_id',
  'setting_id',
  'title',
  'created_at',
  'updated_at',
  'stocks(stock_code,ticker,company_name_ko,market)'
].join(',');

export async function listFavoriteStocks(userId) {
  const favorites = await requestSupabaseRest(
    `favorite_stocks?select=${FAVORITE_SELECT}&user_id=eq.${userId}&order=display_order.asc,created_at.desc`
  );

  if (!favorites.length) {
    return [];
  }

  const stockIds = [...new Set(favorites.map((favorite) => Number(favorite.stock_id)))];
  const analysisRuns = await requestSupabaseRest(
    'ai_analysis_runs?' +
      'select=analysis_id,stock_id,analysis_type,overall_signal,overall_score,summary_text,caution_text,created_at' +
      `&stock_id=in.(${stockIds.join(',')})` +
      '&analysis_type=in.(financial,combined)' +
      '&order=created_at.desc'
  );
  const latestAnalysisByStockId = new Map();

  for (const analysis of analysisRuns) {
    const stockId = Number(analysis.stock_id);
    if (!latestAnalysisByStockId.has(stockId)) {
      latestAnalysisByStockId.set(stockId, analysis);
    }
  }

  return favorites.map((favorite) => ({
    ...favorite,
    latest_analysis: latestAnalysisByStockId.get(Number(favorite.stock_id)) || null
  }));
}

export async function addFavoriteStock(userId, { stockId, memo, displayOrder = 0 }) {
  const normalizedStockId = Number(stockId);
  if (!Number.isInteger(normalizedStockId) || normalizedStockId <= 0) {
    throw badRequest('stockId must be a positive integer.');
  }

  const rows = await requestSupabaseRest('favorite_stocks', {
    method: 'POST',
    prefer: 'return=representation,resolution=merge-duplicates',
    body: {
      user_id: userId,
      stock_id: normalizedStockId,
      memo: normalizeMemo(memo),
      display_order: normalizeDisplayOrder(displayOrder)
    }
  });

  return rows[0];
}

export async function removeFavoriteStock(userId, favoriteId) {
  const normalizedFavoriteId = normalizeFavoriteId(favoriteId);

  await requestSupabaseRest(`favorite_stocks?favorite_id=eq.${normalizedFavoriteId}&user_id=eq.${userId}`, {
    method: 'DELETE'
  });

  return { status: 'ok' };
}

export async function updateFavoriteStock(userId, favoriteId, { memo, displayOrder }) {
  const normalizedFavoriteId = normalizeFavoriteId(favoriteId);
  const body = {};

  if (memo !== undefined) {
    body.memo = normalizeMemo(memo);
  }

  if (displayOrder !== undefined) {
    body.display_order = normalizeDisplayOrder(displayOrder);
  }

  if (!Object.keys(body).length) {
    throw badRequest('memo or displayOrder is required.');
  }

  const rows = await requestSupabaseRest(
    `favorite_stocks?favorite_id=eq.${normalizedFavoriteId}&user_id=eq.${userId}`,
    {
      method: 'PATCH',
      prefer: 'return=representation',
      body
    }
  );

  if (!rows.length) {
    throw Object.assign(new Error('Favorite stock not found.'), { statusCode: 404 });
  }

  return rows[0];
}

function normalizeFavoriteId(favoriteId) {
  const normalizedFavoriteId = Number(favoriteId);
  if (!Number.isInteger(normalizedFavoriteId) || normalizedFavoriteId <= 0) {
    throw badRequest('favoriteId must be a positive integer.');
  }

  return normalizedFavoriteId;
}

function normalizeMemo(memo) {
  if (memo === undefined || memo === null || memo === '') {
    return null;
  }

  if (typeof memo !== 'string') {
    throw badRequest('memo must be a string.');
  }

  if (memo.trim().length > 500) {
    throw badRequest('memo must be 500 characters or fewer.');
  }

  return memo.trim() || null;
}

function normalizeDisplayOrder(displayOrder) {
  const normalizedDisplayOrder = Number(displayOrder);
  if (!Number.isInteger(normalizedDisplayOrder) || normalizedDisplayOrder < 0) {
    throw badRequest('displayOrder must be a non-negative integer.');
  }

  return normalizedDisplayOrder;
}

export async function listSearchHistories(userId, limit = 20) {
  return requestSupabaseRest(
    `stock_search_histories?select=${SEARCH_HISTORY_SELECT}&user_id=eq.${userId}&order=searched_at.desc&limit=${Number(limit) || 20}`
  );
}

export async function listRecentSearchHistoriesForPopular(limit = 200) {
  return requestSupabaseRest(
    `stock_search_histories?select=${SEARCH_HISTORY_SELECT}&stock_id=not.is.null&order=searched_at.desc&limit=${Number(limit) || 200}`
  );
}

export async function recordSearchHistory(userId, { queryText, stockId = null, resultCount = 0 }) {
  if (!queryText?.trim()) {
    throw badRequest('queryText is required.');
  }

  if (stockId !== null && (!Number.isInteger(Number(stockId)) || Number(stockId) <= 0)) {
    throw badRequest('stockId must be a positive integer.');
  }

  if (!Number.isInteger(Number(resultCount)) || Number(resultCount) < 0) {
    throw badRequest('resultCount must be a non-negative integer.');
  }

  const rows = await requestSupabaseRest('stock_search_histories', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: userId,
      query_text: queryText.trim(),
      stock_id: stockId ? Number(stockId) : null,
      result_count: Number(resultCount) || 0
    }
  });

  return rows[0];
}

export async function listChatSessions(userId, limit = 20) {
  return requestSupabaseRest(
    `ai_chat_sessions?select=${CHAT_SESSION_SELECT}&user_id=eq.${userId}&order=updated_at.desc&limit=${Number(limit) || 20}`
  );
}

export async function createChatSession(userId, { stockId = null, settingId = null, title = null }) {
  const rows = await requestSupabaseRest('ai_chat_sessions', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      user_id: Number(userId),
      stock_id: stockId ? Number(stockId) : null,
      setting_id: settingId ? Number(settingId) : null,
      title: title?.trim() || null
    }
  });

  return rows[0];
}

export async function findOwnedChatSession(userId, chatSessionId) {
  const rows = await requestSupabaseRest(
    `ai_chat_sessions?select=${CHAT_SESSION_SELECT}` +
      `&chat_session_id=eq.${Number(chatSessionId)}` +
      `&user_id=eq.${Number(userId)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function listChatMessagesForOwnedSession(userId, chatSessionId) {
  if (!chatSessionId) {
    throw badRequest('chatSessionId is required.');
  }

  const sessions = await requestSupabaseRest(
    `ai_chat_sessions?select=chat_session_id&chat_session_id=eq.${chatSessionId}&user_id=eq.${userId}&limit=1`
  );

  if (!sessions.length) {
    throw Object.assign(new Error('Chat session not found.'), { statusCode: 404 });
  }

  return requestSupabaseRest(
    `ai_chat_messages?select=message_id,chat_session_id,role,message_text,related_analysis_id,token_count,created_at&chat_session_id=eq.${chatSessionId}&order=created_at.asc`
  );
}

export async function createChatMessage({
  chatSessionId,
  role,
  messageText,
  relatedAnalysisId = null,
  tokenCount = null
}) {
  const rows = await requestSupabaseRest('ai_chat_messages', {
    method: 'POST',
    prefer: 'return=representation',
    body: {
      chat_session_id: Number(chatSessionId),
      role,
      message_text: messageText,
      related_analysis_id: relatedAnalysisId ? Number(relatedAnalysisId) : null,
      token_count: tokenCount === null ? null : Number(tokenCount)
    }
  });

  return rows[0];
}

export async function touchChatSession(chatSessionId) {
  const rows = await requestSupabaseRest(`ai_chat_sessions?chat_session_id=eq.${Number(chatSessionId)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      updated_at: new Date().toISOString()
    }
  });

  return rows[0];
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
