import {
  addFavoriteStock,
  analyzeStock,
  clearAccessToken,
  collectStockPrices,
  createChatSession,
  getFavoriteStocks,
  getChatMessages,
  getChatSessions,
  getMe,
  getPopularStocks,
  getSearchHistories,
  getStockDetail,
  getStockNews,
  getStockPrices,
  getStockSummary,
  getStoredAccessToken,
  login,
  logout,
  recordStockSearchClick,
  removeFavoriteStock,
  refreshStockNews,
  searchStocks,
  sendChatMessage,
  signup,
  storeAccessToken,
  updateFavoriteStock
} from '../lib/api.js';

const statusEl = document.querySelector('[data-auth-status]');
const userEl = document.querySelector('[data-auth-user]');
const signupForm = document.querySelector('[data-signup-form]');
const loginForm = document.querySelector('[data-login-form]');
const meButton = document.querySelector('[data-me-button]');
const logoutButton = document.querySelector('[data-logout-button]');
const topLoginButton = document.querySelector('.top-login-button');
const authSummaryEl = document.querySelector('[data-auth-summary]');
const authScreen = document.querySelector('[data-auth-screen]');
const authViews = document.querySelectorAll('[data-auth-view]');
const authScreenOpenButtons = document.querySelectorAll('[data-auth-screen-open]');
const authCloseButtons = document.querySelectorAll('[data-auth-close]');
const authScreenStatusEl = document.querySelector('[data-auth-screen-status]');
const homeOpenButton = document.querySelector('[data-home-open]');
const favoritesOpenButton = document.querySelector('[data-favorites-open]');
const stockSearchForm = document.querySelector('[data-stock-search-form]');
const stockSearchInput = document.querySelector('[data-stock-search-input]');
const stockSearchResultsEl = document.querySelector('[data-stock-search-results]');
const searchResultsView = document.querySelector('[data-search-results-view]');
const searchResultsTitleEl = document.querySelector('[data-search-results-title]');
const searchResultsMetaEl = document.querySelector('[data-search-results-meta]');
const searchHistoriesEl = document.querySelector('[data-search-histories]');
const popularStocksEl = document.querySelector('[data-popular-stocks]');
const favoritesSectionEl = document.querySelector('[data-favorites-section]');
const favoriteListEl = document.querySelector('[data-favorite-list]');
const favoriteCountEl = document.querySelector('[data-favorite-count]');
const homeDashboard = document.querySelector('[data-home-dashboard]');
const favoritesView = document.querySelector('[data-favorites-view]');
const summaryPanel = document.querySelector('[data-summary-panel]');
const summaryEmptyMessageEl = summaryPanel.querySelector('[data-summary-empty] p');
const summaryNameEl = document.querySelector('[data-summary-name]');
const summaryMetaEl = document.querySelector('[data-summary-meta]');
const summaryCloseButton = document.querySelector('[data-summary-close]');
const summaryEmptyEl = document.querySelector('[data-summary-empty]');
const summaryContentEl = document.querySelector('[data-summary-content]');
const overallSignalDotEl = document.querySelector('[data-overall-signal-dot]');
const overallSignalEl = document.querySelector('[data-overall-signal]');
const overallScoreEl = document.querySelector('[data-overall-score]');
const summaryTextEl = document.querySelector('[data-summary-text]');
const reasonTextEl = document.querySelector('[data-reason-text]');
const cautionTextEl = document.querySelector('[data-caution-text]');
const analysisPeriodEl = document.querySelector('[data-analysis-period]');
const metricGridEl = document.querySelector('[data-metric-grid]');
const priceChartEl = document.querySelector('[data-price-chart]');
const priceChartEmptyEl = document.querySelector('[data-price-chart-empty]');
const pricePeriodEl = document.querySelector('[data-price-period]');
const priceLatestEl = document.querySelector('[data-price-latest]');
const priceChangeEl = document.querySelector('[data-price-change]');
const priceVolumeEl = document.querySelector('[data-price-volume]');
const newsListEl = document.querySelector('[data-news-list]');
const newsEmptyEl = document.querySelector('[data-news-empty]');
const newsRefreshButton = document.querySelector('[data-news-refresh]');
const metricDetailEl = document.querySelector('[data-metric-detail]');
const detailTitleEl = document.querySelector('[data-detail-title]');
const detailMetaEl = document.querySelector('[data-detail-meta]');
const detailCurrentValueEl = document.querySelector('[data-detail-current-value]');
const detailPreviousValueEl = document.querySelector('[data-detail-previous-value]');
const detailIndustryAverageEl = document.querySelector('[data-detail-industry-average]');
const detailBeginnerExplanationEl = document.querySelector('[data-detail-beginner-explanation]');
const detailReasonEl = document.querySelector('[data-detail-reason]');
const detailComparisonEl = document.querySelector('[data-detail-comparison]');
const detailCheckPointEl = document.querySelector('[data-detail-check-point]');
const detailBenchmarkNoteEl = document.querySelector('[data-detail-benchmark-note]');
const detailCloseButton = document.querySelector('[data-detail-close]');
const runAnalysisButton = document.querySelector('[data-run-analysis]');
const refreshAnalysisButton = document.querySelector('[data-refresh-analysis]');
const favoriteButton = document.querySelector('[data-favorite-button]');
const questionForm = document.querySelector('[data-question-form]');
const questionInput = document.querySelector('[data-question-input]');
const questionSubmitButton = questionForm.querySelector('button[type="submit"]');
const questionExamplesEl = document.querySelector('[data-question-examples]');
const chatNewButton = document.querySelector('[data-chat-new]');
const chatSessionListEl = document.querySelector('[data-chat-session-list]');
const chatEmptyEl = document.querySelector('[data-chat-empty]');
const chatTranscriptEl = document.querySelector('[data-chat-transcript]');

let lastSearchQuery = '';
let lastSearchResultCount = 0;
let lastSearchResults = [];
let selectedStock = null;
let selectedSummary = null;
let chatSessionId = null;
let chatSessions = [];
let selectedMetricCode = null;
let favoriteStocks = [];
let authReturnPath = '/home';

const METRIC_LABELS = {
  PER: '주가수익비율',
  PBR: '주가순자산비율',
  DEBT_RATIO: '부채비율',
  OPERATING_MARGIN: '영업이익률',
  OPERATING_PROFIT_GROWTH: '영업이익 성장률',
  REVENUE_GROWTH: '매출 성장률',
  ROE: '자기자본이익률'
};

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setAuthStatus('회원가입 요청 중...');

  try {
    const payload = formToObject(signupForm);
    const result = await signup(payload);
    handleAuthResult(result, '회원가입이 완료되었습니다.');
  } catch (error) {
    showAuthError(error);
  }
});

loginForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setAuthStatus('로그인 요청 중...');

  try {
    const payload = formToObject(loginForm);
    const result = await login(payload);
    handleAuthResult(result, '로그인되었습니다.');
  } catch (error) {
    showAuthError(error);
  }
});

meButton.addEventListener('click', async () => {
  if (!getStoredAccessToken()) {
    openAuthScreen('login');
    setAuthStatus('내 정보를 확인하려면 로그인하세요.');
    return;
  }

  setStatus('사용자 정보를 확인하는 중...');

  try {
    const result = await getMe();
    renderUser(result.user);
    openAuthScreen('account');
    setAuthStatus('로그인 상태입니다.');
    setStatus('로그인 상태입니다.');
  } catch (error) {
    clearAccessToken();
    renderUser(null);
    renderFavoriteStocks([]);
    openAuthScreen('login');
    showAuthError(error);
  }
});

logoutButton.addEventListener('click', async () => {
  setStatus('로그아웃 요청 중...');

  try {
    await logout();
    renderUser(null);
    renderSearchHistories([]);
    renderFavoriteStocks([]);
    resetChatWorkspace();
    closeAuthScreen();
    setStatus('로그아웃되었습니다.');
  } catch (error) {
    showError(error);
  }
});

homeOpenButton.addEventListener('click', () => {
  navigateTo('/home').catch(showError);
});

authScreenOpenButtons.forEach((button) => {
  button.addEventListener('click', () => {
    openAuthScreen(button.dataset.authScreenOpen);
  });
});

favoritesOpenButton.addEventListener('click', async () => {
  await openFavorites();
});

authCloseButtons.forEach((button) => {
  button.addEventListener('click', () => {
    closeAuthScreen();
  });
});

stockSearchForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await runStockSearch(stockSearchInput.value, { updateRoute: true });
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

  await runStockSearch(button.dataset.stockQuery, { updateRoute: true });
});

summaryCloseButton.addEventListener('click', () => {
  navigateTo('/home').catch(showError);
});

metricGridEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-metric-code]');
  if (!button || !selectedSummary?.metrics) {
    return;
  }

  const metric = selectedSummary.metrics.find((item) => item.metric_code === button.dataset.metricCode);
  if (metric) {
    showMetricDetail(metric);
  }
});

detailCloseButton.addEventListener('click', () => {
  closeMetricDetail();
});

runAnalysisButton.addEventListener('click', async () => {
  await runSelectedStockAnalysis();
});

refreshAnalysisButton.addEventListener('click', async () => {
  await runSelectedStockAnalysis({ forceRefresh: true });
});

newsRefreshButton.addEventListener('click', async () => {
  await refreshSelectedStockNews();
});

favoriteButton.addEventListener('click', async () => {
  if (!selectedStock) {
    return;
  }

  if (!getStoredAccessToken()) {
    openAuthScreen('login');
    setAuthStatus('관심종목을 추가하려면 로그인하세요.');
    setStatus('관심종목을 추가하려면 로그인하세요.');
    return;
  }

  const favorite = findFavoriteByStockId(selectedStock.stock_id);
  setStatus(favorite ? '관심종목에서 삭제하는 중...' : '관심종목에 추가하는 중...');

  try {
    if (favorite) {
      await removeFavoriteStock(favorite.favorite_id);
    } else {
      await addFavoriteStock({ stockId: Number(selectedStock.stock_id) });
    }
    await loadFavoriteStocks();
    setStatus(favorite ? '관심종목에서 삭제했습니다.' : '관심종목에 추가했습니다.');
  } catch (error) {
    showError(error);
  }
});

favoriteListEl.addEventListener('click', async (event) => {
  const removeButton = event.target.closest('[data-favorite-remove]');
  if (removeButton) {
    await deleteFavorite(removeButton.dataset.favoriteRemove);
    return;
  }

  const moveButton = event.target.closest('[data-favorite-move]');
  if (moveButton) {
    await moveFavorite(moveButton.dataset.favoriteMove, Number(moveButton.dataset.direction));
    return;
  }

  const stockButton = event.target.closest('[data-favorite-stock-id]');
  if (stockButton) {
    await openFavoriteStock(stockButton.dataset.favoriteStockId);
  }
});

favoriteListEl.addEventListener('submit', async (event) => {
  const form = event.target.closest('[data-favorite-memo-form]');
  if (!form) {
    return;
  }

  event.preventDefault();
  await saveFavoriteMemo(form);
});

questionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await askQuestion(questionInput.value);
});

questionExamplesEl.addEventListener('click', (event) => {
  const button = event.target.closest('[data-question-example]');
  if (!button) {
    return;
  }

  questionInput.value = button.dataset.questionExample;
  questionInput.focus();
});

chatNewButton.addEventListener('click', () => {
  startNewChat();
});

chatSessionListEl.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-chat-session-id]');
  if (!button) {
    return;
  }

  await loadChatSession(button.dataset.chatSessionId);
});

window.addEventListener('popstate', () => {
  applyRoute().catch(showError);
});

window.addEventListener('hashchange', () => {
  applyRoute().catch(showError);
});

await initializeHome();

async function initializeHome() {
  renderUser(null);
  await loadPopularStocks();

  if (getStoredAccessToken()) {
    try {
      const result = await getMe();
      renderUser(result.user);
      await Promise.all([loadSearchHistories(), loadFavoriteStocks().catch(() => {})]);
      setStatus('로그인 상태입니다.');
    } catch {
      clearAccessToken();
      renderUser(null);
      renderFavoriteStocks([]);
      setStatus('삼성전자를 검색해 볼 수 있습니다.');
    }
  }

  await applyRoute();
}

async function runStockSearch(query, { updateRoute = false } = {}) {
  lastSearchQuery = query.trim();

  if (!lastSearchQuery) {
    showSearchView();
    stockSearchResultsEl.innerHTML = '';
    searchResultsTitleEl.textContent = '검색 결과';
    searchResultsMetaEl.textContent = '검색어를 입력하면 결과가 표시됩니다.';
    setStatus('검색어를 입력하세요.');
    return;
  }

  stockSearchInput.value = lastSearchQuery;
  if (updateRoute) {
    setRoutePath(`/search?q=${encodeURIComponent(lastSearchQuery)}`);
  }
  showSearchView();
  searchResultsTitleEl.textContent = `"${lastSearchQuery}" 검색 결과`;
  searchResultsMetaEl.textContent = '종목을 찾는 중입니다.';
  stockSearchResultsEl.innerHTML = '<li><span>검색 결과를 불러오는 중입니다.</span></li>';
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
  selectedStock = stock;
  selectedSummary = null;
  chatSessions = [];
  startNewChat();
  selectedMetricCode = null;
  enterSummaryView(stock);
  setSummaryLoading();

  const tasks = [
    loadStockSummary(stock.stock_id),
    loadStockPrices(stock.stock_id),
    loadStockNews(stock.stock_id)
  ];
  if (getStoredAccessToken()) {
    tasks.push(saveSearchSelection(stock));
    tasks.push(loadChatSessionsForSelectedStock());
  } else {
    renderChatSessions([]);
  }

  await Promise.all(tasks);
}

function handleAuthResult(result, message) {
  storeAccessToken(result.accessToken);
  renderUser(result.user);
  const destination = authReturnPath;
  closeAuthScreen({ restoreRoute: false });
  loadSearchHistories();
  loadFavoriteStocks().catch(showError);
  if (selectedStock) {
    loadChatSessionsForSelectedStock().catch(showError);
  }
  setStatus(message);
  navigateTo(destination).catch(showError);
}

function formToObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function renderUser(user) {
  if (!user) {
    userEl.textContent = '로그인된 사용자가 없습니다.';
    authSummaryEl.textContent = '로그인이 필요합니다.';
    topLoginButton.hidden = false;
    logoutButton.hidden = true;
    return;
  }

  userEl.innerHTML = `
    <strong>${escapeHtml(user.nickname || user.email)}</strong>
    <span>${escapeHtml(user.email)}</span>
    <span>최근 로그인: ${escapeHtml(formatDateTime(user.last_login_at))}</span>
  `;
  authSummaryEl.textContent = `${user.nickname || user.email}님`;
  topLoginButton.hidden = true;
  logoutButton.hidden = false;
}

function renderStockResults(results) {
  searchResultsTitleEl.textContent = `"${lastSearchQuery}" 검색 결과`;
  searchResultsMetaEl.textContent = `${results.length}개 종목을 찾았습니다. 원하는 종목을 선택하면 요약분석으로 이동합니다.`;

  if (!results.length) {
    stockSearchResultsEl.innerHTML = '<li><span>검색 결과가 없습니다. 회사명, 종목코드, 별칭을 다시 확인해 주세요.</span></li>';
    return;
  }

  stockSearchResultsEl.innerHTML = results.map((stock) => `
    <li>
      <button class="result-button" type="button" data-stock-id="${escapeHtml(stock.stock_id)}">
        <strong>${escapeHtml(stock.company_name_ko)}</strong>
        <span>${escapeHtml(stock.stock_code)} · ${escapeHtml(stock.market)} · ${escapeHtml(stock.matched_value || stock.ticker)}</span>
        <small>${escapeHtml(stock.industry_name || stock.company_name_en || '업종 정보 없음')}</small>
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
  const uniqueHistories = dedupeSearchHistories(histories);

  if (!uniqueHistories.length) {
    searchHistoriesEl.innerHTML = '<li><span>최근 검색 기록이 없습니다.</span></li>';
    return;
  }

  searchHistoriesEl.innerHTML = uniqueHistories.map((history) => `
    <li>
      <strong>${escapeHtml(history.stocks?.company_name_ko || history.query_text)}</strong>
      <span>${escapeHtml(history.query_text)} · 결과 ${escapeHtml(history.result_count)}개</span>
    </li>
  `).join('');
}

function dedupeSearchHistories(histories) {
  const seenKeys = new Set();
  const uniqueHistories = [];

  for (const history of histories) {
    const key = history.stock_id
      ? `stock:${history.stock_id}`
      : `query:${String(history.query_text || '').trim().toLowerCase()}`;

    if (seenKeys.has(key)) {
      continue;
    }

    seenKeys.add(key);
    uniqueHistories.push(history);
  }

  return uniqueHistories;
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

async function openFavorites({ updateRoute = true } = {}) {
  if (!getStoredAccessToken()) {
    authReturnPath = '/favorites';
    openAuthScreen('login');
    setAuthStatus('관심종목을 확인하려면 로그인하세요.');
    setStatus('관심종목을 확인하려면 로그인하세요.');
    return;
  }

  closeAuthScreen({ restoreRoute: false });
  showFavoritesView();
  if (updateRoute) {
    setRoutePath('/favorites');
  }

  await loadFavoriteStocks().catch(showError);
  favoritesSectionEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

async function loadFavoriteStocks() {
  try {
    const result = await getFavoriteStocks();
    renderFavoriteStocks(result.data || []);
  } catch (error) {
    favoriteStocks = [];
    favoriteCountEl.textContent = '불러오지 못했습니다.';
    favoriteListEl.innerHTML = '<li><span>관심종목을 불러오지 못했습니다.</span></li>';
    updateFavoriteButtonState();
    throw error;
  }
}

function renderFavoriteStocks(favorites) {
  favoriteStocks = [...favorites].sort((left, right) => {
    const orderDifference = Number(left.display_order) - Number(right.display_order);
    if (orderDifference !== 0) {
      return orderDifference;
    }

    return String(right.created_at || '').localeCompare(String(left.created_at || ''));
  });
  updateFavoriteButtonState();

  if (!getStoredAccessToken()) {
    favoriteCountEl.textContent = '로그인 후 확인할 수 있습니다.';
    favoriteListEl.innerHTML = '<li><span>로그인 후 관심종목을 관리할 수 있습니다.</span></li>';
    return;
  }

  favoriteCountEl.textContent = `총 ${favoriteStocks.length}개`;
  if (!favoriteStocks.length) {
    favoriteListEl.innerHTML = '<li><span>추가한 관심종목이 없습니다.</span></li>';
    return;
  }

  favoriteListEl.innerHTML = favoriteStocks.map((favorite, index) => {
    const stock = favorite.stocks || {};
    const analysis = favorite.latest_analysis;
    const signal = analysis?.overall_signal || 'gray';

    return `
      <li class="favorite-item">
        <div class="favorite-item-header">
          <button class="favorite-stock-button" type="button" data-favorite-stock-id="${escapeHtml(favorite.stock_id)}">
            <strong>${escapeHtml(stock.company_name_ko || '종목명 없음')}</strong>
            <span>${escapeHtml(stock.stock_code || '-')} · ${escapeHtml(stock.market || '-')}</span>
          </button>
          <span class="signal-chip">
            <span class="signal-dot ${signalClass(signal)}"></span>
            ${escapeHtml(signalLabel(signal))}
          </span>
        </div>
        <p class="favorite-summary">${escapeHtml(analysis?.summary_text || '저장된 최신 AI 분석이 없습니다.')}</p>
        <p class="favorite-caution">${escapeHtml(analysis?.caution_text || '요약분석 화면에서 재무 분석을 실행하면 주의할 점을 확인할 수 있습니다.')}</p>
        <div class="favorite-item-footer">
          <form class="favorite-memo-form" data-favorite-memo-form="${escapeHtml(favorite.favorite_id)}">
            <input name="memo" type="text" maxlength="500" value="${escapeHtml(favorite.memo || '')}" placeholder="관심 메모" aria-label="${escapeHtml(stock.company_name_ko || '관심종목')} 메모" />
            <button class="ghost-button" type="submit">저장</button>
          </form>
          <div class="favorite-controls">
            <span class="favorite-date">${escapeHtml(formatDate(favorite.created_at))}</span>
            <button class="icon-button" type="button" data-favorite-move="${escapeHtml(favorite.favorite_id)}" data-direction="-1" title="위로 이동" aria-label="위로 이동"${index === 0 ? ' disabled' : ''}>↑</button>
            <button class="icon-button" type="button" data-favorite-move="${escapeHtml(favorite.favorite_id)}" data-direction="1" title="아래로 이동" aria-label="아래로 이동"${index === favoriteStocks.length - 1 ? ' disabled' : ''}>↓</button>
            <button class="icon-button" type="button" data-favorite-remove="${escapeHtml(favorite.favorite_id)}" title="관심종목 삭제" aria-label="관심종목 삭제">×</button>
          </div>
        </div>
      </li>
    `;
  }).join('');
}

function updateFavoriteButtonState() {
  const isFavorite = selectedStock && findFavoriteByStockId(selectedStock.stock_id);
  favoriteButton.textContent = isFavorite ? '관심종목 삭제' : '관심종목 추가';
  favoriteButton.setAttribute('aria-pressed', String(Boolean(isFavorite)));
}

function findFavoriteByStockId(stockId) {
  return favoriteStocks.find((favorite) => String(favorite.stock_id) === String(stockId));
}

async function deleteFavorite(favoriteId) {
  setStatus('관심종목에서 삭제하는 중...');

  try {
    await removeFavoriteStock(favoriteId);
    await loadFavoriteStocks();
    setStatus('관심종목에서 삭제했습니다.');
  } catch (error) {
    showError(error);
  }
}

async function moveFavorite(favoriteId, direction) {
  const currentIndex = favoriteStocks.findIndex((favorite) => String(favorite.favorite_id) === String(favoriteId));
  const targetIndex = currentIndex + direction;
  if (currentIndex < 0 || targetIndex < 0 || targetIndex >= favoriteStocks.length) {
    return;
  }

  const reorderedFavorites = [...favoriteStocks];
  [reorderedFavorites[currentIndex], reorderedFavorites[targetIndex]] = [
    reorderedFavorites[targetIndex],
    reorderedFavorites[currentIndex]
  ];
  renderFavoriteStocks(reorderedFavorites.map((favorite, index) => ({ ...favorite, display_order: index })));
  setStatus('관심종목 순서를 저장하는 중...');

  try {
    await Promise.all(reorderedFavorites.map((favorite, index) => (
      updateFavoriteStock(favorite.favorite_id, { displayOrder: index })
    )));
    await loadFavoriteStocks();
    setStatus('관심종목 순서를 저장했습니다.');
  } catch (error) {
    await loadFavoriteStocks().catch(() => {});
    showError(error);
  }
}

async function saveFavoriteMemo(form) {
  setStatus('관심종목 메모를 저장하는 중...');

  try {
    await updateFavoriteStock(form.dataset.favoriteMemoForm, {
      memo: new FormData(form).get('memo')
    });
    await loadFavoriteStocks();
    setStatus('관심종목 메모를 저장했습니다.');
  } catch (error) {
    showError(error);
  }
}

async function openFavoriteStock(stockId) {
  setStatus('관심종목 분석을 불러오는 중...');

  try {
    const result = await getStockDetail(stockId);
    await handleStockSelection(result.data);
  } catch (error) {
    showError(error);
  }
}

function enterSummaryView(stock) {
  summaryNameEl.textContent = `${stock.company_name_ko} 요약분석`;
  summaryMetaEl.textContent = `${stock.stock_code} · ${stock.ticker} · ${stock.market} · ${stock.industry_name || '업종 정보 없음'}`;
  document.body.classList.add('summary-mode');
  document.body.classList.remove('favorites-mode', 'search-mode');
  homeDashboard.hidden = true;
  searchResultsView.hidden = true;
  favoritesView.hidden = true;
  summaryPanel.hidden = false;
  updateFavoriteButtonState();
  stockSearchResultsEl.innerHTML = '';
  setRoutePath(`/summary/${stock.stock_id}`);
  summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeSummary({ updateRoute = true } = {}) {
  selectedStock = null;
  selectedSummary = null;
  chatSessionId = null;
  chatSessions = [];
  document.body.classList.remove('summary-mode', 'favorites-mode', 'search-mode');
  summaryPanel.hidden = true;
  homeDashboard.hidden = false;
  searchResultsView.hidden = true;
  favoritesView.hidden = true;
  resetChatWorkspace();
  closeMetricDetail();
  if (updateRoute) {
    setRoutePath('/home');
  }
}

async function saveSearchSelection(stock) {
  try {
    await recordStockSearchClick({
      queryText: lastSearchQuery || stock.company_name_ko,
      stockId: Number(stock.stock_id),
      resultCount: lastSearchResultCount || 1
    });
    await Promise.all([loadSearchHistories(), loadPopularStocks()]);
  } catch (error) {
    showError(error);
  }
}

async function loadSummaryFromRoute(stockId) {
  try {
    const result = await getStockDetail(stockId);
    selectedStock = result.data;
    chatSessions = [];
    startNewChat();
    enterSummaryView(selectedStock);
    setSummaryLoading();
    await Promise.all([
      loadStockSummary(selectedStock.stock_id),
      loadStockPrices(selectedStock.stock_id),
      loadStockNews(selectedStock.stock_id)
    ]);
    if (getStoredAccessToken()) {
      await loadChatSessionsForSelectedStock();
    } else {
      renderChatSessions([]);
    }
  } catch (error) {
    showError(error);
  }
}

async function loadStockSummary(stockId) {
  setStatus('요약분석을 불러오는 중...');

  try {
    const result = await getStockSummary(stockId);
    selectedSummary = result.data;
    if (selectedSummary.analysis) {
      renderSummary(selectedSummary);
      setStatus('요약분석을 불러왔습니다.');
      return;
    }

    await autoCollectStockSummary(stockId);
  } catch (error) {
    showError(error);
    showSummaryEmpty();
  }
}

async function autoCollectStockSummary(stockId) {
  if (!getStoredAccessToken()) {
    showSummaryEmpty('저장된 요약분석이 없습니다. 새 분석은 로그인 후 실행할 수 있습니다.');
    setStatus('새 요약분석을 실행하려면 로그인하세요.');
    return;
  }

  setSummaryAutoCollecting();
  setStatus('요약분석 데이터가 없어 자동으로 분석을 실행하는 중...');

  try {
    const result = await analyzeStock(stockId, {
      fiscalYear: 2024,
      forceRefresh: false
    });

    if (!isSelectedStock(stockId)) {
      return;
    }

    selectedSummary = result.data;
    renderSummary(selectedSummary);
    setStatus(result.data.cached ? '저장된 최신 분석 결과를 불러왔습니다.' : '요약분석을 자동으로 준비했습니다.');
  } catch (error) {
    if (!isSelectedStock(stockId)) {
      return;
    }

    showError(error);
    showSummaryEmpty();
  }
}

async function runSelectedStockAnalysis({ forceRefresh = false } = {}) {
  if (!selectedStock) {
    return;
  }

  if (!ensureLoggedInForWrite('재무 분석을 실행하려면 로그인하세요.')) {
    return;
  }

  setSummaryLoading();
  setStatus(forceRefresh ? '재무 데이터를 확인하고 분석을 갱신하는 중...' : '재무 분석을 실행하는 중...');

  try {
    const result = await analyzeStock(selectedStock.stock_id, {
      fiscalYear: 2024,
      forceRefresh
    });
    selectedSummary = result.data;
    renderSummary(selectedSummary);
    setStatus(result.data.cached ? '저장된 최신 분석 결과를 불러왔습니다.' : '새로운 분석 결과를 저장했습니다.');
  } catch (error) {
    showError(error);
    showSummaryEmpty();
  }
}

function setSummaryLoading() {
  summaryEmptyEl.hidden = true;
  summaryContentEl.hidden = false;
  overallSignalDotEl.className = 'signal-dot gray';
  overallSignalEl.textContent = '분석 중';
  overallScoreEl.textContent = '-';
  summaryTextEl.textContent = '재무 분석 결과를 확인하고 있습니다.';
  reasonTextEl.textContent = '';
  cautionTextEl.textContent = '';
  analysisPeriodEl.textContent = '';
  metricGridEl.innerHTML = '<span class="loading-text">주요 지표를 불러오는 중입니다.</span>';
  closeMetricDetail({ rerender: false });
}

function setSummaryAutoCollecting() {
  summaryEmptyEl.hidden = true;
  summaryContentEl.hidden = false;
  overallSignalDotEl.className = 'signal-dot gray';
  overallSignalEl.textContent = '준비 중';
  overallScoreEl.textContent = '-';
  summaryTextEl.innerHTML = loadingMarkup('요약분석을 자동으로 준비하고 있습니다. 잠시만 있으면 결과를 볼 수 있습니다');
  reasonTextEl.textContent = '재무 지표를 계산하고 AI 설명을 생성하는 중입니다.';
  cautionTextEl.textContent = '';
  analysisPeriodEl.textContent = '';
  metricGridEl.innerHTML = loadingMarkup('주요 지표를 수집하고 있습니다');
  closeMetricDetail({ rerender: false });
}

async function loadStockPrices(stockId) {
  setPriceChartLoading();

  try {
    const result = await getStockPrices(stockId, 30);
    if (!isSelectedStock(stockId)) {
      return;
    }

    if (!(result.data?.prices || []).length) {
      await autoCollectStockPrices(stockId);
      return;
    }

    renderPriceChart(result.data);
  } catch (error) {
    if (!isSelectedStock(stockId)) {
      return;
    }

    showError(error);
    await autoCollectStockPrices(stockId);
  }
}

function setPriceChartLoading() {
  priceLatestEl.textContent = '-';
  priceChangeEl.textContent = '-';
  priceChangeEl.className = 'price-change';
  priceVolumeEl.textContent = '-';
  pricePeriodEl.textContent = '최근 30거래일';
  priceChartEl.innerHTML = '';
  priceChartEl.setAttribute('hidden', '');
  priceChartEmptyEl.hidden = false;
  priceChartEmptyEl.textContent = '최근 주가 데이터를 불러오는 중입니다.';
}

async function autoCollectStockPrices(stockId) {
  if (!getStoredAccessToken()) {
    showPriceChartEmpty('최근 주가 데이터가 없습니다. 새 수집은 로그인 후 실행할 수 있습니다.');
    setStatus('최근 주가를 새로 수집하려면 로그인하세요.');
    return;
  }

  setPriceAutoCollecting();
  setStatus('최근 주가 데이터가 없어 자동으로 수집하는 중...');

  try {
    const result = await collectStockPrices(stockId, {
      days: 30,
      recentDays: 90,
      forceRefresh: false
    });

    if (!isSelectedStock(stockId)) {
      return;
    }

    if ((result.data?.prices || []).length) {
      renderPriceChart(result.data);
      setStatus('최근 주가를 자동으로 준비했습니다.');
      return;
    }

    showPriceChartEmpty('수집된 최근 주가 데이터가 없습니다.');
  } catch (error) {
    if (!isSelectedStock(stockId)) {
      return;
    }

    showError(error);
    showPriceChartEmpty('최근 주가 자동 수집에 실패했습니다.');
  }
}

function setPriceAutoCollecting() {
  priceLatestEl.textContent = '-';
  priceChangeEl.textContent = '-';
  priceChangeEl.className = 'price-change';
  priceVolumeEl.textContent = '-';
  pricePeriodEl.textContent = '최근 30거래일';
  priceChartEl.innerHTML = '';
  priceChartEl.setAttribute('hidden', '');
  priceChartEmptyEl.hidden = false;
  priceChartEmptyEl.innerHTML = loadingMarkup('최근 주가를 자동으로 수집하고 있습니다. 잠시만 있으면 그래프를 볼 수 있습니다');
}

async function loadStockNews(stockId) {
  setNewsLoading();

  try {
    const result = await getStockNews(stockId, 5);
    if (!isSelectedStock(stockId)) {
      return;
    }

    if (!(result.data.news || []).length) {
      await autoCollectStockNews(stockId);
      return;
    }

    renderStockNews(result.data.news || []);
  } catch (error) {
    if (!isSelectedStock(stockId)) {
      return;
    }

    showError(error);
    await autoCollectStockNews(stockId);
  }
}

async function autoCollectStockNews(stockId) {
  if (!getStoredAccessToken()) {
    showNewsEmpty('최근 뉴스 데이터가 없습니다. 새 수집은 로그인 후 실행할 수 있습니다.');
    setStatus('최근 뉴스를 새로 수집하려면 로그인하세요.');
    return;
  }

  setNewsAutoCollecting();
  setStatus('최근 뉴스가 없어 자동으로 수집하고 AI로 해석하는 중...');

  try {
    const result = await refreshStockNews(stockId, {
      limit: 5,
      forceRefresh: false
    });

    if (!isSelectedStock(stockId)) {
      return;
    }

    renderStockNews(result.data.news || []);
    setStatus(result.data.llm?.fallback
      ? '최근 뉴스를 저장했습니다. AI 연결 문제로 임시 분류를 표시합니다.'
      : '최근 뉴스 분석을 자동으로 준비했습니다.');
  } catch (error) {
    if (!isSelectedStock(stockId)) {
      return;
    }

    showError(error);
    showNewsEmpty('최근 뉴스 자동 수집에 실패했습니다.');
  }
}

async function refreshSelectedStockNews() {
  if (!selectedStock) {
    return;
  }

  if (!ensureLoggedInForWrite('뉴스를 갱신하려면 로그인하세요.')) {
    return;
  }

  setNewsLoading();
  newsRefreshButton.disabled = true;
  setStatus('최근 뉴스를 수집하고 AI로 해석하는 중...');

  try {
    const result = await refreshStockNews(selectedStock.stock_id, {
      limit: 5,
      forceRefresh: true
    });
    renderStockNews(result.data.news || []);
    setStatus(result.data.llm?.fallback
      ? '최근 뉴스를 저장했습니다. AI 연결 문제로 임시 분류를 표시합니다.'
      : '최근 뉴스와 AI 영향 분석을 갱신했습니다.');
  } catch (error) {
    showError(error);
    showNewsEmpty('최근 뉴스 갱신에 실패했습니다.');
  } finally {
    newsRefreshButton.disabled = false;
  }
}

function setNewsLoading() {
  newsListEl.innerHTML = '';
  newsListEl.hidden = true;
  newsEmptyEl.hidden = false;
  newsEmptyEl.textContent = '최근 뉴스를 불러오는 중입니다.';
}

function setNewsAutoCollecting() {
  newsListEl.innerHTML = '';
  newsListEl.hidden = true;
  newsEmptyEl.hidden = false;
  newsEmptyEl.innerHTML = loadingMarkup('최근 뉴스를 자동으로 수집하고 AI로 해석하고 있습니다. 잠시만 있으면 결과를 볼 수 있습니다');
}

function showNewsEmpty(message) {
  newsListEl.innerHTML = '';
  newsListEl.hidden = true;
  newsEmptyEl.hidden = false;
  newsEmptyEl.textContent = message;
}

function renderStockNews(news) {
  if (!news.length) {
    showNewsEmpty('수집된 뉴스가 없습니다. 뉴스 갱신을 실행하세요.');
    return;
  }

  newsListEl.innerHTML = news.map((item) => {
    const article = item.article || {};
    const analysis = item.analysis || {};
    const sentiment = analysis.sentiment || 'neutral';

    return `
      <article class="news-card">
        <div class="news-card-header">
          <span class="news-sentiment ${escapeHtml(sentiment)}">${escapeHtml(newsSentimentLabel(sentiment))}</span>
          <span class="news-meta">${escapeHtml(article.publisher || '출처 확인 필요')} · ${escapeHtml(formatNewsDate(article.published_at))}</span>
        </div>
        <h4><a href="${escapeHtml(article.content_url || '#')}" target="_blank" rel="noopener noreferrer">${escapeHtml(article.title || '제목 없음')}</a></h4>
        <p>${escapeHtml(analysis.impact_summary || article.summary || '기사 요약이 없습니다.')}</p>
        <p class="news-reason">${escapeHtml(analysis.reason_text || 'AI 영향 분석을 갱신하면 판단 이유를 확인할 수 있습니다.')}</p>
        <div class="news-keywords">${(analysis.risk_keywords || []).map((keyword) => `<span>${escapeHtml(keyword)}</span>`).join('')}</div>
      </article>
    `;
  }).join('');
  newsListEl.hidden = false;
  newsEmptyEl.hidden = true;
}

function renderPriceChart(result) {
  const prices = result?.prices || [];
  if (!prices.length) {
    showPriceChartEmpty('수집된 최근 주가 데이터가 없습니다. 키움 일봉 수집을 먼저 실행하세요.');
    return;
  }

  const latest = result.latest || prices.at(-1);
  const changeRate = toOptionalNumber(latest.change_rate);
  priceLatestEl.textContent = `${formatNumber(latest.close_price, 0)}원`;
  priceChangeEl.textContent = changeRate === null ? '-' : `${changeRate > 0 ? '+' : ''}${formatNumber(changeRate, 2)}%`;
  priceChangeEl.className = `price-change ${changeRate > 0 ? 'up' : changeRate < 0 ? 'down' : ''}`;
  priceVolumeEl.textContent = `${formatNumber(latest.volume, 0)}주`;
  pricePeriodEl.textContent = `${formatChartDate(prices[0].trade_date)} - ${formatChartDate(prices.at(-1).trade_date)} · 종가 기준`;
  priceChartEl.innerHTML = buildPriceChartSvg(prices);
  priceChartEl.removeAttribute('hidden');
  priceChartEmptyEl.hidden = true;
}

function showPriceChartEmpty(message) {
  priceLatestEl.textContent = '-';
  priceChangeEl.textContent = '-';
  priceChangeEl.className = 'price-change';
  priceVolumeEl.textContent = '-';
  pricePeriodEl.textContent = '최근 30거래일';
  priceChartEl.innerHTML = '';
  priceChartEl.setAttribute('hidden', '');
  priceChartEmptyEl.hidden = false;
  priceChartEmptyEl.textContent = message;
}

function buildPriceChartSvg(prices) {
  const width = 760;
  const height = 250;
  const padding = { top: 18, right: 72, bottom: 32, left: 12 };
  const values = prices.map((price) => Number(price.close_price));
  const rawMin = Math.min(...values);
  const rawMax = Math.max(...values);
  const spread = rawMax - rawMin || Math.max(rawMax * 0.02, 1);
  const min = rawMin - spread * 0.12;
  const max = rawMax + spread * 0.12;
  const graphWidth = width - padding.left - padding.right;
  const graphHeight = height - padding.top - padding.bottom;
  const x = (index) => padding.left + (prices.length === 1 ? graphWidth / 2 : (index / (prices.length - 1)) * graphWidth);
  const y = (value) => padding.top + ((max - value) / (max - min)) * graphHeight;
  const points = prices.map((price, index) => `${x(index).toFixed(2)},${y(Number(price.close_price)).toFixed(2)}`);
  const areaPath = [
    `M ${x(0).toFixed(2)} ${height - padding.bottom}`,
    ...points.map((point) => `L ${point.replace(',', ' ')}`),
    `L ${x(prices.length - 1).toFixed(2)} ${height - padding.bottom}`,
    'Z'
  ].join(' ');
  const ticks = [rawMax, (rawMax + rawMin) / 2, rawMin];
  const dateIndexes = [...new Set([0, Math.floor((prices.length - 1) / 2), prices.length - 1])];
  const markerIndexes = [...new Set([
    0,
    Math.floor((prices.length - 1) / 2),
    prices.length - 1
  ])];
  const latestPrice = prices.at(-1);

  return `
    <defs>
      <linearGradient id="price-chart-fill" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="#1a73e8" stop-opacity="0.2"></stop>
        <stop offset="100%" stop-color="#1a73e8" stop-opacity="0"></stop>
      </linearGradient>
    </defs>
    ${ticks.map((tick) => `
      <line class="price-grid-line" x1="${padding.left}" x2="${width - padding.right}" y1="${y(tick)}" y2="${y(tick)}"></line>
      <text class="price-axis-label" x="${width - padding.right + 10}" y="${y(tick) + 4}">${escapeHtml(formatNumber(tick, 0))}원</text>
    `).join('')}
    <path class="price-chart-area" d="${areaPath}"></path>
    <polyline class="price-chart-line" points="${points.join(' ')}"></polyline>
    ${markerIndexes.map((index) => `
      <circle class="price-chart-point" cx="${x(index).toFixed(2)}" cy="${y(Number(prices[index].close_price)).toFixed(2)}" r="4"></circle>
    `).join('')}
    <circle class="price-chart-latest" cx="${x(prices.length - 1).toFixed(2)}" cy="${y(Number(latestPrice.close_price)).toFixed(2)}" r="6"></circle>
    ${dateIndexes.map((index) => `
      <text class="price-date-label" x="${x(index)}" y="${height - 8}" text-anchor="${index === 0 ? 'start' : index === prices.length - 1 ? 'end' : 'middle'}">${escapeHtml(formatChartDate(prices[index].trade_date))}</text>
    `).join('')}
  `;
}

function renderSummary(summary) {
  if (!summary?.analysis) {
    showSummaryEmpty();
    return;
  }

  const { analysis, metrics = [], setting } = summary;
  summaryEmptyEl.hidden = true;
  summaryContentEl.hidden = false;
  overallSignalDotEl.className = `signal-dot ${signalClass(analysis.overall_signal)}`;
  overallSignalEl.textContent = signalLabel(analysis.overall_signal);
  overallScoreEl.textContent = formatNumber(analysis.overall_score, 1);
  summaryTextEl.textContent = analysis.summary_text || '';
  reasonTextEl.textContent = analysis.reason_text || '';
  cautionTextEl.textContent = analysis.caution_text || '';
  analysisPeriodEl.textContent = `${analysis.source_period || ''}${setting ? ` · ${setting.setting_name}` : ''}`;
  metricGridEl.innerHTML = metrics.map(renderMetricCard).join('');

  if (selectedMetricCode) {
    const selectedMetric = metrics.find((metric) => metric.metric_code === selectedMetricCode);
    if (selectedMetric) {
      showMetricDetail(selectedMetric, { scroll: false });
    } else {
      closeMetricDetail();
    }
  }
}

function showSummaryEmpty(message = '저장된 요약분석이 없습니다. 재무 데이터를 확인하고 분석을 실행합니다.') {
  summaryEmptyMessageEl.textContent = message;
  summaryEmptyEl.hidden = false;
  summaryContentEl.hidden = true;
}

function ensureLoggedInForWrite(message) {
  if (getStoredAccessToken()) {
    return true;
  }

  openAuthScreen('login');
  setAuthStatus(message);
  setStatus(message);
  return false;
}

function renderMetricCard(metric) {
  const label = METRIC_LABELS[metric.metric_code] || metric.metric_code;
  const unit = metric.metric_code === 'PER' || metric.metric_code === 'PBR' ? '배' : '%';

  return `
    <button class="metric-card metric-card-button${selectedMetricCode === metric.metric_code ? ' active' : ''}" type="button" data-metric-code="${escapeHtml(metric.metric_code)}">
      <div class="metric-card-header">
        <strong>${escapeHtml(label)}</strong>
        <span class="signal-chip">
          <span class="signal-dot ${signalClass(metric.signal)}"></span>
          ${escapeHtml(signalLabel(metric.signal))}
        </span>
      </div>
      <div class="metric-value">${escapeHtml(formatNumber(metric.metric_value, 2))}${escapeHtml(unit)}</div>
      <p>${escapeHtml(metric.beginner_explanation || metric.reason_text || '')}</p>
      <p class="metric-check">${escapeHtml(metric.check_point_text || '')}</p>
    </button>
  `;
}

function showMetricDetail(metric, { scroll = true } = {}) {
  selectedMetricCode = metric.metric_code;
  const label = METRIC_LABELS[metric.metric_code] || metric.metric_code;
  const unit = metricUnit(metric.metric_code);
  const industryAverage = toOptionalNumber(metric.industry_avg_value);
  const hasIndustryAverage = industryAverage !== null;

  detailTitleEl.textContent = `${label} 상세`;
  detailMetaEl.textContent = `${signalLabel(metric.signal)} · 내부 점수 ${formatNumber(metric.score, 1)}점`;
  detailCurrentValueEl.textContent = formatMetricValue(metric.metric_value, unit);
  detailPreviousValueEl.textContent = formatPreviousValue(metric);
  detailIndustryAverageEl.textContent = hasIndustryAverage
    ? formatMetricValue(industryAverage, unit)
    : '준비 중';
  detailBeginnerExplanationEl.textContent = metric.beginner_explanation || '설명이 준비되지 않았습니다.';
  detailReasonEl.textContent = metric.reason_text || '판단 이유가 준비되지 않았습니다.';
  detailComparisonEl.textContent = buildComparisonText(metric);
  detailCheckPointEl.textContent = metric.check_point_text || '추가 확인 포인트가 준비되지 않았습니다.';
  detailBenchmarkNoteEl.hidden = !hasIndustryAverage;
  detailBenchmarkNoteEl.textContent = hasIndustryAverage
    ? `업종 평균은 ${formatMetricValue(industryAverage, unit)}입니다. 현재 값과 업종 평균을 함께 비교해 보세요.`
    : '';
  metricDetailEl.hidden = false;
  rerenderMetricCards();

  if (scroll) {
    metricDetailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

function closeMetricDetail({ rerender = true } = {}) {
  selectedMetricCode = null;
  metricDetailEl.hidden = true;
  if (rerender) {
    rerenderMetricCards();
  }
}

function rerenderMetricCards() {
  if (!selectedSummary?.metrics?.length) {
    return;
  }

  metricGridEl.innerHTML = selectedSummary.metrics.map(renderMetricCard).join('');
}

function buildComparisonText(metric) {
  const previous = toOptionalNumber(metric.previous_value);
  if (previous === null) {
    return '이전 기간 비교 데이터가 아직 준비되지 않았습니다.';
  }

  if (metric.metric_code === 'REVENUE_GROWTH') {
    return `전년도 매출액은 ${formatWon(previous)}입니다. 현재 매출 성장률은 ${formatMetricValue(metric.metric_value, '%')}입니다.`;
  }

  if (metric.metric_code === 'OPERATING_PROFIT_GROWTH') {
    return `전년도 영업이익은 ${formatWon(previous)}입니다. 현재 영업이익 성장률은 ${formatMetricValue(metric.metric_value, '%')}입니다.`;
  }

  const current = Number(metric.metric_value);
  if (!Number.isFinite(current)) {
    return '현재 지표값을 확인할 수 없습니다.';
  }

  const difference = current - previous;
  const direction = difference > 0 ? '상승' : difference < 0 ? '하락' : '유지';
  return `이전 기간 ${formatMetricValue(previous, metricUnit(metric.metric_code))}에서 현재 ${formatMetricValue(current, metricUnit(metric.metric_code))}로 ${formatMetricValue(Math.abs(difference), metricUnit(metric.metric_code))}p ${direction}했습니다.`;
}

function formatPreviousValue(metric) {
  const previous = toOptionalNumber(metric.previous_value);
  if (previous === null) {
    return '-';
  }

  if (metric.metric_code === 'REVENUE_GROWTH' || metric.metric_code === 'OPERATING_PROFIT_GROWTH') {
    return formatWon(previous);
  }

  return formatMetricValue(previous, metricUnit(metric.metric_code));
}

async function loadChatSessionsForSelectedStock() {
  if (!selectedStock || !getStoredAccessToken()) {
    renderChatSessions([]);
    return;
  }

  try {
    const result = await getChatSessions(selectedStock.stock_id);
    chatSessions = result.data || [];
    renderChatSessions(chatSessions);
  } catch (error) {
    chatSessions = [];
    chatSessionListEl.innerHTML = '<li><span>이전 질문을 불러오지 못했습니다.</span></li>';
    throw error;
  }
}

function renderChatSessions(sessions) {
  chatSessions = sessions;

  if (!getStoredAccessToken()) {
    chatSessionListEl.innerHTML = '<li><span>로그인 후 확인할 수 있습니다.</span></li>';
    return;
  }

  if (!sessions.length) {
    chatSessionListEl.innerHTML = '<li><span>저장된 이전 질문이 없습니다.</span></li>';
    return;
  }

  chatSessionListEl.innerHTML = sessions.map((session) => `
    <li>
      <button class="chat-session-button${String(session.chat_session_id) === String(chatSessionId) ? ' active' : ''}" type="button" data-chat-session-id="${escapeHtml(session.chat_session_id)}">
        <strong>${escapeHtml(session.title || `${selectedStock?.company_name_ko || '종목'} 재무 질문`)}</strong>
        <span>${escapeHtml(formatDateTime(session.updated_at || session.created_at))}</span>
      </button>
    </li>
  `).join('');
}

async function loadChatSession(sessionId) {
  setStatus('이전 질문을 불러오는 중...');

  try {
    const result = await getChatMessages(sessionId);
    chatSessionId = Number(sessionId);
    renderChatSessions(chatSessions);
    renderChatMessages(result.data || []);
    setStatus('이전 질문을 불러왔습니다.');
  } catch (error) {
    showError(error);
  }
}

function startNewChat() {
  chatSessionId = null;
  renderChatSessions(chatSessions);
  clearChatMessages('새 질문을 입력하면 종목별 대화가 저장됩니다.');
  questionInput.value = '';
}

function resetChatWorkspace() {
  chatSessionId = null;
  chatSessions = [];
  renderChatSessions([]);
  clearChatMessages('질문 예시를 선택하거나 직접 질문을 입력하세요.');
  questionInput.value = '';
}

function clearChatMessages(emptyMessage) {
  chatTranscriptEl.hidden = true;
  chatTranscriptEl.innerHTML = '';
  chatEmptyEl.hidden = false;
  chatEmptyEl.textContent = emptyMessage;
}

function renderChatMessages(messages) {
  clearChatMessages('저장된 메시지가 없습니다. 새 질문을 입력하세요.');

  for (const message of messages) {
    renderChatMessage(message.role, message.message_text, message.created_at);
  }
}

async function askQuestion(rawQuestion) {
  const question = rawQuestion.trim();
  if (!question || !selectedStock) {
    return;
  }

  if (!getStoredAccessToken()) {
    openAuthScreen('login');
    setAuthStatus('AI 질문을 보내려면 로그인하세요.');
    setStatus('AI 질문을 보내려면 로그인하세요.');
    return;
  }

  renderChatMessage('user', question);
  questionInput.value = '';
  questionInput.disabled = true;
  questionSubmitButton.disabled = true;
  questionSubmitButton.textContent = '답변 생성 중';
  const thinkingMessageEl = renderChatThinkingMessage();
  setStatus('AI가 재무 분석 결과를 확인하는 중...');

  try {
    if (!chatSessionId) {
      const sessionResult = await createChatSession({
        stockId: Number(selectedStock.stock_id),
        settingId: selectedSummary?.setting?.setting_id || null,
        title: `${selectedStock.company_name_ko} 재무 질문`
      });
      chatSessionId = sessionResult.data.chat_session_id;
    }

    const result = await sendChatMessage(chatSessionId, question);
    thinkingMessageEl.remove();
    renderChatMessage('assistant', result.data.assistantMessage.message_text);
    await loadChatSessionsForSelectedStock();
    setStatus('AI 답변을 저장했습니다.');
  } catch (error) {
    thinkingMessageEl.remove();
    showError(error);
  } finally {
    questionInput.disabled = false;
    questionSubmitButton.disabled = false;
    questionSubmitButton.textContent = '질문 보내기';
    questionInput.focus();
  }
}

function renderChatMessage(role, message, createdAt = null) {
  chatEmptyEl.hidden = true;
  chatTranscriptEl.hidden = false;
  const content = role === 'assistant'
    ? `<div class="message-content markdown-content">${renderMarkdown(message)}</div>`
    : `<p class="message-content">${escapeHtml(message)}</p>`;
  chatTranscriptEl.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${escapeHtml(role)}">
      <strong>${role === 'assistant' ? 'AI 답변' : '내 질문'}</strong>
      ${content}
      ${createdAt ? `<span>${escapeHtml(formatDateTime(createdAt))}</span>` : ''}
    </div>
  `);
  chatTranscriptEl.scrollTop = chatTranscriptEl.scrollHeight;
}

function renderChatThinkingMessage() {
  chatEmptyEl.hidden = true;
  chatTranscriptEl.hidden = false;
  chatTranscriptEl.insertAdjacentHTML('beforeend', `
    <div class="chat-message assistant thinking" data-chat-thinking>
      <strong>AI 답변</strong>
      <div class="message-content typing-indicator" aria-live="polite" aria-label="AI가 답변을 생성하고 있습니다.">
        <i aria-hidden="true"></i>
        <i aria-hidden="true"></i>
        <i aria-hidden="true"></i>
        <span class="typing-label">답변을 생성하고 있습니다</span>
      </div>
    </div>
  `);
  chatTranscriptEl.scrollTop = chatTranscriptEl.scrollHeight;
  return chatTranscriptEl.lastElementChild;
}

function renderMarkdown(value) {
  const lines = String(value ?? '').replace(/\r\n?/g, '\n').split('\n');
  const html = [];
  let paragraphLines = [];
  let listItems = [];
  let listType = null;
  let codeLines = [];
  let inCodeBlock = false;

  const flushParagraph = () => {
    if (!paragraphLines.length) {
      return;
    }

    html.push(`<p>${renderInlineMarkdown(paragraphLines.join(' '))}</p>`);
    paragraphLines = [];
  };

  const flushList = () => {
    if (!listItems.length) {
      return;
    }

    html.push(`<${listType}>${listItems.map((item) => `<li>${item}</li>`).join('')}</${listType}>`);
    listItems = [];
    listType = null;
  };

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
        codeLines = [];
        inCodeBlock = false;
      } else {
        flushParagraph();
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    if (!trimmed) {
      flushParagraph();
      flushList();
      continue;
    }

    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      flushParagraph();
      flushList();
      const level = headingMatch[1].length;
      html.push(`<h${level}>${renderInlineMarkdown(headingMatch[2])}</h${level}>`);
      continue;
    }

    const quoteMatch = trimmed.match(/^>\s?(.+)$/);
    if (quoteMatch) {
      flushParagraph();
      flushList();
      html.push(`<blockquote><p>${renderInlineMarkdown(quoteMatch[1])}</p></blockquote>`);
      continue;
    }

    const unorderedMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    const orderedMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (unorderedMatch || orderedMatch) {
      flushParagraph();
      const nextListType = orderedMatch ? 'ol' : 'ul';
      if (listType && listType !== nextListType) {
        flushList();
      }
      listType = nextListType;
      listItems.push(renderInlineMarkdown((unorderedMatch || orderedMatch)[1]));
      continue;
    }

    flushList();
    paragraphLines.push(trimmed);
  }

  if (inCodeBlock) {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
  }

  flushParagraph();
  flushList();

  return html.join('');
}

function renderInlineMarkdown(value) {
  const tokens = [];
  let html = escapeHtml(value);

  html = html.replace(/`([^`]+)`/g, (_match, code) => {
    const token = `@@CODE${tokens.length}@@`;
    tokens.push(`<code>${code}</code>`);
    return token;
  });

  html = html
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, (_match, label, url) => {
      const safeUrl = sanitizeMarkdownUrl(url);
      return safeUrl ? `<a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${label}</a>` : label;
    })
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/__([^_]+)__/g, '<strong>$1</strong>')
    .replace(/\*([^*\s][^*]*?)\*/g, '<em>$1</em>')
    .replace(/_([^_\s][^_]*?)_/g, '<em>$1</em>');

  for (const [index, tokenHtml] of tokens.entries()) {
    html = html.replace(`@@CODE${index}@@`, tokenHtml);
  }

  return html;
}

function sanitizeMarkdownUrl(url) {
  const decodedUrl = String(url).replace(/&amp;/g, '&');

  try {
    const parsedUrl = new URL(decodedUrl);
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return '';
    }

    return escapeHtml(parsedUrl.href);
  } catch {
    return '';
  }
}

function loadingMarkup(message) {
  return `
    <span class="auto-loading" role="status">
      <span class="loading-spinner" aria-hidden="true"></span>
      <span>${escapeHtml(message)}</span>
      <span class="loading-dots" aria-hidden="true"></span>
    </span>
  `;
}

function isSelectedStock(stockId) {
  return String(selectedStock?.stock_id || '') === String(stockId);
}

function setStatus(message) {
  statusEl.textContent = message;
}

function openAuthScreen(mode = 'login') {
  const resolvedMode = mode === 'account' && !getStoredAccessToken() ? 'login' : mode;

  if (!isAuthPath(window.location.pathname)) {
    authReturnPath = normalizePath();
  }
  authViews.forEach((view) => {
    view.hidden = view.dataset.authView !== resolvedMode;
  });
  authScreen.hidden = false;
  setAuthStatus('');
  setRoutePath(`/${resolvedMode}`);

  const firstInput = authScreen.querySelector(`[data-auth-view="${resolvedMode}"] input`);
  firstInput?.focus();
}

function closeAuthScreen({ restoreRoute = true } = {}) {
  authScreen.hidden = true;
  setAuthStatus('');
  if (restoreRoute && isAuthPath(window.location.pathname)) {
    navigateTo(authReturnPath).catch(showError);
  }
}

function setAuthStatus(message) {
  authScreenStatusEl.textContent = message;
}

function showAuthError(error) {
  setAuthStatus(error.message);
  setStatus(error.message);
}

function showError(error) {
  setStatus(error.message);
}

async function navigateTo(path) {
  const normalizedPath = normalizePath(path);
  setRoutePath(normalizedPath);
  await applyRoute();
}

async function applyRoute() {
  const normalizedPath = normalizePath();
  if (normalizedPath !== window.location.pathname || window.location.hash) {
    setRoutePath(normalizedPath, { replace: true });
  }

  if (normalizedPath === '/home') {
    closeAuthScreen({ restoreRoute: false });
    showHomeView();
    return;
  }

  if (normalizedPath.startsWith('/search')) {
    closeAuthScreen({ restoreRoute: false });
    await loadSearchFromRoute(normalizedPath);
    return;
  }

  if (normalizedPath === '/favorites') {
    await openFavorites({ updateRoute: false });
    return;
  }

  const authMatch = normalizedPath.match(/^\/(login|signup|account)$/);
  if (authMatch) {
    openAuthScreen(authMatch[1]);
    return;
  }

  const summaryMatch = normalizedPath.match(/^\/summary\/(\d+)$/);
  if (summaryMatch) {
    closeAuthScreen({ restoreRoute: false });
    if (String(selectedStock?.stock_id) === summaryMatch[1] && !summaryPanel.hidden) {
      return;
    }

    await loadSummaryFromRoute(summaryMatch[1]);
    return;
  }

  setRoutePath('/home', { replace: true });
  showHomeView();
}

async function loadSearchFromRoute(routePath) {
  const url = new URL(routePath, window.location.origin);
  const query = url.searchParams.get('q') || '';
  showSearchView();

  if (!query.trim()) {
    stockSearchInput.value = '';
    lastSearchQuery = '';
    lastSearchResults = [];
    lastSearchResultCount = 0;
    stockSearchResultsEl.innerHTML = '';
    searchResultsTitleEl.textContent = '검색 결과';
    searchResultsMetaEl.textContent = '검색어를 입력하면 결과가 표시됩니다.';
    setStatus('검색어를 입력하세요.');
    return;
  }

  await runStockSearch(query, { updateRoute: false });
}

function showHomeView() {
  document.body.classList.remove('summary-mode', 'favorites-mode', 'search-mode');
  homeDashboard.hidden = false;
  searchResultsView.hidden = true;
  favoritesView.hidden = true;
  summaryPanel.hidden = true;
  stockSearchResultsEl.innerHTML = '';
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showSearchView() {
  document.body.classList.remove('summary-mode', 'favorites-mode');
  document.body.classList.add('search-mode');
  homeDashboard.hidden = true;
  searchResultsView.hidden = false;
  favoritesView.hidden = true;
  summaryPanel.hidden = true;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function showFavoritesView() {
  document.body.classList.remove('summary-mode', 'search-mode');
  document.body.classList.add('favorites-mode');
  homeDashboard.hidden = true;
  searchResultsView.hidden = true;
  favoritesView.hidden = false;
  summaryPanel.hidden = true;
}

function normalizePath(path = `${window.location.pathname}${window.location.search}`) {
  const legacySummary = window.location.hash.match(/^#summary-(\d+)$/);
  if (legacySummary) {
    return `/summary/${legacySummary[1]}`;
  }

  const hashRoute = window.location.hash.match(/^#(\/.+)$/);
  if (hashRoute) {
    return hashRoute[1];
  }

  if (!path || path === '/') {
    return '/home';
  }

  const [pathname, search = ''] = path.split('?');
  if (pathname === '/search') {
    return search ? `/search?${search}` : '/search';
  }

  return pathname;
}

function isAuthPath(path) {
  return /^\/(login|signup|account)$/.test(path);
}

function setRoutePath(path, { replace = false } = {}) {
  const currentPath = `${window.location.pathname}${window.location.search}`;
  if (currentPath === path && !window.location.hash) {
    return;
  }

  window.history[replace ? 'replaceState' : 'pushState'](null, '', path);
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatNumber(value, maximumFractionDigits = 2) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '-';
  }

  return numberValue.toLocaleString('ko-KR', { maximumFractionDigits });
}

function formatDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return `${date.toLocaleDateString('ko-KR')} 추가`;
}

function formatDateTime(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatChartDate(value) {
  const match = String(value || '').match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${Number(match[1])}/${Number(match[2])}` : '-';
}

function formatNewsDate(value) {
  if (!value) {
    return '-';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '-';
  }

  return date.toLocaleString('ko-KR', {
    month: 'numeric',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function newsSentimentLabel(sentiment) {
  return {
    positive: '긍정',
    negative: '부정',
    neutral: '중립',
    mixed: '혼합'
  }[sentiment] || '중립';
}

function formatMetricValue(value, unit) {
  return `${formatNumber(value, 2)}${unit}`;
}

function metricUnit(metricCode) {
  return metricCode === 'PER' || metricCode === 'PBR' ? '배' : '%';
}

function formatWon(value) {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return '-';
  }

  return `${numberValue.toLocaleString('ko-KR', { maximumFractionDigits: 0 })}원`;
}

function toOptionalNumber(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : null;
}

function signalLabel(signal) {
  return {
    green: '양호',
    orange: '확인 필요',
    red: '주의',
    gray: '분석 전'
  }[signal] || '분석 전';
}

function signalClass(signal) {
  return ['green', 'orange', 'red', 'gray'].includes(signal) ? signal : 'gray';
}
