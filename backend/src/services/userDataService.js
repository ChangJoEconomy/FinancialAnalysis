import {
  addFavoriteStock,
  listChatMessagesForOwnedSession,
  listChatSessions,
  listFavoriteStocks,
  listSearchHistories,
  recordSearchHistory,
  removeFavoriteStock
} from '../repositories/userScopedRepository.js';

export async function getFavoriteStocks(authContext) {
  return listFavoriteStocks(authContext.userId);
}

export async function createFavoriteStock(authContext, payload) {
  return addFavoriteStock(authContext.userId, payload);
}

export async function deleteFavoriteStock(authContext, favoriteId) {
  return removeFavoriteStock(authContext.userId, favoriteId);
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
