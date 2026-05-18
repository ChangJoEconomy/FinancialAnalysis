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
  return requestSupabaseRest(
    `favorite_stocks?select=${FAVORITE_SELECT}&user_id=eq.${userId}&order=display_order.asc,created_at.desc`
  );
}

export async function addFavoriteStock(userId, { stockId, memo, displayOrder = 0 }) {
  if (!stockId) {
    throw badRequest('stockId is required.');
  }

  const rows = await requestSupabaseRest('favorite_stocks', {
    method: 'POST',
    prefer: 'return=representation,resolution=merge-duplicates',
    body: {
      user_id: userId,
      stock_id: Number(stockId),
      memo: memo || null,
      display_order: Number(displayOrder) || 0
    }
  });

  return rows[0];
}

export async function removeFavoriteStock(userId, favoriteId) {
  if (!favoriteId) {
    throw badRequest('favoriteId is required.');
  }

  await requestSupabaseRest(`favorite_stocks?favorite_id=eq.${favoriteId}&user_id=eq.${userId}`, {
    method: 'DELETE'
  });

  return { status: 'ok' };
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

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}
