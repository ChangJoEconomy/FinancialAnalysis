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
