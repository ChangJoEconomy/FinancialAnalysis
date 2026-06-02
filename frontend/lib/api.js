const API_BASE_URL = 'http://127.0.0.1:4000';
const TOKEN_KEY = 'financial-analysis-access-token';

export function getStoredAccessToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function storeAccessToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  }
}

export function clearAccessToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export async function signup(payload) {
  return request('/api/auth/signup', {
    method: 'POST',
    body: payload
  });
}

export async function login(payload) {
  return request('/api/auth/login', {
    method: 'POST',
    body: payload
  });
}

export async function getMe() {
  return request('/api/auth/me', {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

export async function logout() {
  const token = getStoredAccessToken();
  if (!token) {
    return;
  }

  await request('/api/auth/logout', {
    method: 'POST',
    accessToken: token
  });
  clearAccessToken();
}

export async function searchStocks(query) {
  const params = new URLSearchParams({ q: query });
  return request(`/api/stocks/search?${params.toString()}`, {
    method: 'GET'
  });
}

export async function getPopularStocks() {
  return request('/api/stocks/popular?limit=5', {
    method: 'GET'
  });
}

export async function getStockDetail(stockId) {
  return request(`/api/stocks/${stockId}`, {
    method: 'GET'
  });
}

export async function getStockSummary(stockId) {
  return request(`/api/stocks/${stockId}/summary`, {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

export async function analyzeStock(stockId, payload = {}) {
  return request(`/api/stocks/${stockId}/analyze`, {
    method: 'POST',
    body: payload,
    accessToken: getStoredAccessToken()
  });
}

export async function getStockFinancials(stockId, fiscalYear = 2024) {
  const params = new URLSearchParams({ fiscalYear: String(fiscalYear) });
  return request(`/api/stocks/${stockId}/financials?${params.toString()}`, {
    method: 'GET'
  });
}

export async function getStockPrices(stockId, days = 30) {
  const params = new URLSearchParams({ days: String(days) });
  return request(`/api/stocks/${stockId}/prices?${params.toString()}`, {
    method: 'GET'
  });
}

export async function recordStockSearchClick(payload) {
  return request('/api/stocks/search-click', {
    method: 'POST',
    body: payload,
    accessToken: getStoredAccessToken()
  });
}

export async function getSearchHistories() {
  return request('/api/me/search-histories?limit=10', {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

export async function addFavoriteStock(payload) {
  return request('/api/me/favorite-stocks', {
    method: 'POST',
    body: payload,
    accessToken: getStoredAccessToken()
  });
}

export async function getFavoriteStocks() {
  return request('/api/me/favorite-stocks', {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

export async function updateFavoriteStock(favoriteId, payload) {
  return request(`/api/me/favorite-stocks/${favoriteId}`, {
    method: 'PATCH',
    body: payload,
    accessToken: getStoredAccessToken()
  });
}

export async function removeFavoriteStock(favoriteId) {
  return request(`/api/me/favorite-stocks/${favoriteId}`, {
    method: 'DELETE',
    accessToken: getStoredAccessToken()
  });
}

export async function getAnalysisSettings() {
  return request('/api/me/analysis-settings', {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

export async function updateAnalysisSettings(payload) {
  return request('/api/me/analysis-settings', {
    method: 'PUT',
    body: payload,
    accessToken: getStoredAccessToken()
  });
}

export async function createChatSession(payload = {}) {
  return request('/api/me/chat-sessions', {
    method: 'POST',
    body: payload,
    accessToken: getStoredAccessToken()
  });
}

export async function getChatSessions(stockId = null) {
  const params = new URLSearchParams({ limit: '20' });
  if (stockId) {
    params.set('stockId', String(stockId));
  }

  return request(`/api/me/chat-sessions?${params.toString()}`, {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

export async function sendChatMessage(chatSessionId, message) {
  return request(`/api/me/chat-sessions/${chatSessionId}/messages`, {
    method: 'POST',
    body: { message },
    accessToken: getStoredAccessToken()
  });
}

export async function getChatMessages(chatSessionId) {
  return request(`/api/me/chat-sessions/${chatSessionId}/messages`, {
    method: 'GET',
    accessToken: getStoredAccessToken()
  });
}

async function request(path, { method, body, accessToken } = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error?.message || 'Request failed.');
  }

  return data;
}
