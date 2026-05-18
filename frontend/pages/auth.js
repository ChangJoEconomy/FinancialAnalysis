import {
  clearAccessToken,
  getMe,
  getPopularStocks,
  getSearchHistories,
  getStoredAccessToken,
  login,
  logout,
  recordStockSearchClick,
  searchStocks,
  signup,
  storeAccessToken
} from '../lib/api.js';

const statusEl = document.querySelector('[data-auth-status]');
const userEl = document.querySelector('[data-auth-user]');
const signupForm = document.querySelector('[data-signup-form]');
const loginForm = document.querySelector('[data-login-form]');
const meButton = document.querySelector('[data-me-button]');
const logoutButton = document.querySelector('[data-logout-button]');
const authToggleButton = document.querySelector('[data-auth-toggle]');
const authCloseButton = document.querySelector('[data-auth-close]');
const authPanel = document.querySelector('[data-auth-panel]');
const stockSearchForm = document.querySelector('[data-stock-search-form]');
const stockSearchInput = document.querySelector('[data-stock-search-input]');
const stockSearchResultsEl = document.querySelector('[data-stock-search-results]');
const searchHistoriesEl = document.querySelector('[data-search-histories]');
const popularStocksEl = document.querySelector('[data-popular-stocks]');
const summaryPanel = document.querySelector('[data-summary-panel]');
const summaryNameEl = document.querySelector('[data-summary-name]');
const summaryMetaEl = document.querySelector('[data-summary-meta]');
const summaryCloseButton = document.querySelector('[data-summary-close]');

let lastSearchQuery = '';
let lastSearchResultCount = 0;
let lastSearchResults = [];

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('회원가입 요청 중...');

  try {
    const payload = formToObject(signupForm);
    const result = await signup(payload);
    handleAuthResult(result, '회원가입이 완료되었습니다.');
  } catch (error) {
    showError(error);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setStatus('로그인 요청 중...');

  try {
    const payload = formToObject(loginForm);
    const result = await login(payload);
    handleAuthResult(result, '로그인되었습니다.');
  } catch (error) {
    showError(error);
  }
});

meButton.addEventListener('click', async () => {
  setStatus('사용자 정보를 확인하는 중...');

  try {
    const result = await getMe();
    renderUser(result.user);
    authPanel.hidden = false;
    setStatus('로그인 상태입니다.');
  } catch (error) {
    clearAccessToken();
    renderUser(null);
    authPanel.hidden = false;
    showError(error);
  }
});

logoutButton.addEventListener('click', async () => {
  setStatus('로그아웃 요청 중...');

  try {
    await logout();
    renderUser(null);
    renderSearchHistories([]);
    setStatus('로그아웃되었습니다.');
  } catch (error) {
    showError(error);
  }
});

authToggleButton.addEventListener('click', () => {
  authPanel.hidden = !authPanel.hidden;
});

authCloseButton.addEventListener('click', () => {
  authPanel.hidden = true;
});

stockSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await runStockSearch(stockSearchInput.value);
});

stockSearchResultsEl.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-stock-id]');
  if (!button) {
    return;
  }

  const stock = lastSearchResults.find((item) => String(item.stock_id) === button.dataset.stockId);
  if (!stock) {
    return;
  }

  await handleStockSelection(stock);
});

popularStocksEl.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-stock-query]');
  if (!button) {
    return;
  }

  await runStockSearch(button.dataset.stockQuery);
});

summaryCloseButton.addEventListener('click', () => {
  summaryPanel.hidden = true;
  window.location.hash = '';
});

await initializeHome();

async function initializeHome() {
  await loadPopularStocks();

  if (getStoredAccessToken()) {
    try {
      const result = await getMe();
      renderUser(result.user);
      await loadSearchHistories();
      setStatus('로그인 상태입니다.');
    } catch {
      clearAccessToken();
      renderUser(null);
      setStatus('삼성전자를 검색해 볼 수 있습니다.');
    }
  }
}

async function runStockSearch(query) {
  lastSearchQuery = query.trim();

  if (!lastSearchQuery) {
    setStatus('검색어를 입력하세요.');
    return;
  }

  stockSearchInput.value = lastSearchQuery;
  setStatus('종목 검색 중...');

  try {
    const results = await searchStocks(lastSearchQuery);
    lastSearchResults = results;
    lastSearchResultCount = results.length;
    renderStockResults(results);
    setStatus(`${results.length}개 종목을 찾았습니다.`);
  } catch (error) {
    showError(error);
  }
}

async function handleStockSelection(stock) {
  showSummary(stock);

  if (!getStoredAccessToken()) {
    authPanel.hidden = false;
    setStatus('로그인하면 최근 검색 기록에 저장됩니다.');
    return;
  }

  setStatus('검색 기록 저장 중...');

  try {
    await recordStockSearchClick({
      queryText: lastSearchQuery || stock.company_name_ko,
      stockId: Number(stock.stock_id),
      resultCount: lastSearchResultCount || 1
    });
    await Promise.all([loadSearchHistories(), loadPopularStocks()]);
    setStatus('검색 기록을 저장했습니다.');
  } catch (error) {
    showError(error);
  }
}

function handleAuthResult(result, message) {
  storeAccessToken(result.accessToken);
  renderUser(result.user);
  authPanel.hidden = true;
  loadSearchHistories();
  setStatus(message);
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function renderUser(user) {
  if (!user) {
    userEl.textContent = '로그인된 사용자가 없습니다.';
    return;
  }

  userEl.textContent = JSON.stringify({
    user_id: user.user_id,
    email: user.email,
    nickname: user.nickname,
    auth_user_id: user.provider_user_id,
    last_login_at: user.last_login_at
  }, null, 2);
}

function renderStockResults(results) {
  if (!results.length) {
    stockSearchResultsEl.innerHTML = '<li><span>검색 결과가 없습니다.</span></li>';
    return;
  }

  stockSearchResultsEl.innerHTML = results.map((stock) => `
    <li>
      <button class="result-button" type="button" data-stock-id="${escapeHtml(stock.stock_id)}">
        <strong>${escapeHtml(stock.company_name_ko)}</strong>
        <span>${escapeHtml(stock.stock_code)} · ${escapeHtml(stock.market)} · ${escapeHtml(stock.matched_value || stock.ticker)}</span>
      </button>
    </li>
  `).join('');
}

async function loadSearchHistories() {
  try {
    const result = await getSearchHistories();
    renderSearchHistories(result.data || []);
  } catch {
    searchHistoriesEl.innerHTML = '<li><span>로그인 후 확인할 수 있습니다.</span></li>';
  }
}

async function loadPopularStocks() {
  try {
    const stocks = await getPopularStocks();
    renderPopularStocks(stocks);
  } catch {
    popularStocksEl.innerHTML = '<li><span>인기 검색종목을 불러오지 못했습니다.</span></li>';
  }
}

function renderSearchHistories(histories) {
  if (!histories.length) {
    searchHistoriesEl.innerHTML = '<li><span>최근 검색 기록이 없습니다.</span></li>';
    return;
  }

  searchHistoriesEl.innerHTML = histories.map((history) => `
    <li>
      <strong>${escapeHtml(history.stocks?.company_name_ko || history.query_text)}</strong>
      <span>${escapeHtml(history.query_text)} · 결과 ${escapeHtml(history.result_count)}개</span>
    </li>
  `).join('');
}

function renderPopularStocks(stocks) {
  if (!stocks.length) {
    popularStocksEl.innerHTML = '<li><span>아직 집계된 종목이 없습니다.</span></li>';
    return;
  }

  popularStocksEl.innerHTML = stocks.map((stock) => `
    <li>
      <button class="text-button" type="button" data-stock-query="${escapeHtml(stock.company_name_ko)}">
        <strong>${escapeHtml(stock.company_name_ko)}</strong>
        <span>${escapeHtml(stock.stock_code)} · 검색 ${escapeHtml(stock.search_count)}회</span>
      </button>
    </li>
  `).join('');
}

function showSummary(stock) {
  summaryNameEl.textContent = `${stock.company_name_ko} 요약분석`;
  summaryMetaEl.textContent = `${stock.stock_code} · ${stock.ticker} · ${stock.market} · ${stock.industry_name || '업종 정보 없음'}`;
  summaryPanel.hidden = false;
  window.location.hash = `summary-${stock.stock_id}`;
  summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function setStatus(message) {
  statusEl.textContent = message;
}

function showError(error) {
  setStatus(error.message);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
