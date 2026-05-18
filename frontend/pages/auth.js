import {
  clearAccessToken,
  getMe,
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
const stockSearchForm = document.querySelector('[data-stock-search-form]');
const stockSearchInput = document.querySelector('[data-stock-search-input]');
const stockSearchResultsEl = document.querySelector('[data-stock-search-results]');
const searchHistoriesEl = document.querySelector('[data-search-histories]');

let lastSearchQuery = '';
let lastSearchResultCount = 0;

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
    setStatus('로그인 상태입니다.');
  } catch (error) {
    clearAccessToken();
    showError(error);
  }
});

logoutButton.addEventListener('click', async () => {
  setStatus('로그아웃 요청 중...');

  try {
    await logout();
    renderUser(null);
    setStatus('로그아웃되었습니다.');
  } catch (error) {
    showError(error);
  }
});

stockSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  lastSearchQuery = stockSearchInput.value.trim();

  if (!lastSearchQuery) {
    setStatus('검색어를 입력하세요.');
    return;
  }

  setStatus('종목 검색 중...');

  try {
    const results = await searchStocks(lastSearchQuery);
    lastSearchResultCount = results.length;
    renderStockResults(results);
    setStatus(`${results.length}개 종목을 찾았습니다.`);
  } catch (error) {
    showError(error);
  }
});

stockSearchResultsEl.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-stock-id]');
  if (!button) {
    return;
  }

  setStatus('검색 기록 저장 중...');

  try {
    await recordStockSearchClick({
      queryText: lastSearchQuery,
      stockId: Number(button.dataset.stockId),
      resultCount: lastSearchResultCount
    });
    await loadSearchHistories();
    setStatus('검색 기록을 저장했습니다.');
  } catch (error) {
    showError(error);
  }
});

if (getStoredAccessToken()) {
  meButton.click();
  loadSearchHistories();
}

function handleAuthResult(result, message) {
  storeAccessToken(result.accessToken);
  renderUser(result.user);
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
    stockSearchResultsEl.innerHTML = '<li>검색 결과가 없습니다.</li>';
    return;
  }

  stockSearchResultsEl.innerHTML = results.map((stock) => `
    <li>
      <button class="result-button" type="button" data-stock-id="${stock.stock_id}">
        <strong>${stock.company_name_ko}</strong>
        <span>${stock.stock_code} · ${stock.market} · ${stock.matched_value || stock.ticker}</span>
      </button>
    </li>
  `).join('');
}

async function loadSearchHistories() {
  try {
    const result = await getSearchHistories();
    renderSearchHistories(result.data || []);
  } catch {
    searchHistoriesEl.innerHTML = '<li>로그인 후 확인할 수 있습니다.</li>';
  }
}

function renderSearchHistories(histories) {
  if (!histories.length) {
    searchHistoriesEl.innerHTML = '<li>최근 검색 기록이 없습니다.</li>';
    return;
  }

  searchHistoriesEl.innerHTML = histories.map((history) => `
    <li>
      <strong>${history.query_text}</strong>
      <span>${history.stocks?.company_name_ko || '선택 종목 없음'} · 결과 ${history.result_count}개</span>
    </li>
  `).join('');
}

function setStatus(message) {
  statusEl.textContent = message;
}

function showError(error) {
  setStatus(error.message);
}
