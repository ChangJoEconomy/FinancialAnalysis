import {
  addFavoriteStock,
  analyzeStock,
  clearAccessToken,
  createChatSession,
  getFavoriteStocks,
  getChatMessages,
  getChatSessions,
  getMe,
  getPopularStocks,
  getSearchHistories,
  getStockDetail,
  getStockPrices,
  getStockSummary,
  getStoredAccessToken,
  login,
  logout,
  recordStockSearchClick,
  removeFavoriteStock,
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
const authToggleButton = document.querySelector('[data-auth-toggle]');
const favoritesOpenButton = document.querySelector('[data-favorites-open]');
const authCloseButton = document.querySelector('[data-auth-close]');
const authPanel = document.querySelector('[data-auth-panel]');
const stockSearchForm = document.querySelector('[data-stock-search-form]');
const stockSearchInput = document.querySelector('[data-stock-search-input]');
const stockSearchResultsEl = document.querySelector('[data-stock-search-results]');
const searchHistoriesEl = document.querySelector('[data-search-histories]');
const popularStocksEl = document.querySelector('[data-popular-stocks]');
const favoritesSectionEl = document.querySelector('[data-favorites-section]');
const favoriteListEl = document.querySelector('[data-favorite-list]');
const favoriteCountEl = document.querySelector('[data-favorite-count]');
const homeDashboard = document.querySelector('[data-home-dashboard]');
const summaryPanel = document.querySelector('[data-summary-panel]');
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

const METRIC_LABELS = {
  DEBT_RATIO: '부채비율',
  OPERATING_MARGIN: '영업이익률',
  OPERATING_PROFIT_GROWTH: '영업이익 성장률',
  REVENUE_GROWTH: '매출 성장률',
  ROE: '자기자본이익률'
};

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
    renderFavoriteStocks([]);
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
    renderFavoriteStocks([]);
    resetChatWorkspace();
    setStatus('로그아웃되었습니다.');
  } catch (error) {
    showError(error);
  }
});

authToggleButton.addEventListener('click', () => {
  authPanel.hidden = !authPanel.hidden;
});

favoritesOpenButton.addEventListener('click', async () => {
  await openFavorites();
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
  closeSummary();
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

favoriteButton.addEventListener('click', async () => {
  if (!selectedStock) {
    return;
  }

  if (!getStoredAccessToken()) {
    authPanel.hidden = false;
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

await initializeHome();

async function initializeHome() {
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

  await loadSummaryFromHash();
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
  selectedStock = stock;
  selectedSummary = null;
  chatSessions = [];
  startNewChat();
  selectedMetricCode = null;
  enterSummaryView(stock);
  setSummaryLoading();

  const tasks = [loadStockSummary(stock.stock_id), loadStockPrices(stock.stock_id)];
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
  authPanel.hidden = true;
  loadSearchHistories();
  loadFavoriteStocks().catch(showError);
  if (selectedStock) {
    loadChatSessionsForSelectedStock().catch(showError);
  }
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

async function openFavorites() {
  if (!getStoredAccessToken()) {
    authPanel.hidden = false;
    setStatus('관심종목을 확인하려면 로그인하세요.');
    return;
  }

  if (!summaryPanel.hidden) {
    closeSummary();
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
  homeDashboard.hidden = true;
  summaryPanel.hidden = false;
  updateFavoriteButtonState();
  stockSearchResultsEl.innerHTML = '';
  window.location.hash = `summary-${stock.stock_id}`;
  summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeSummary() {
  selectedStock = null;
  selectedSummary = null;
  chatSessionId = null;
  chatSessions = [];
  document.body.classList.remove('summary-mode');
  summaryPanel.hidden = true;
  homeDashboard.hidden = false;
  resetChatWorkspace();
  closeMetricDetail();
  window.location.hash = '';
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

async function loadSummaryFromHash() {
  const match = window.location.hash.match(/^#summary-(\d+)$/);
  if (!match) {
    return;
  }

  try {
    const result = await getStockDetail(match[1]);
    selectedStock = result.data;
    chatSessions = [];
    startNewChat();
    enterSummaryView(selectedStock);
    setSummaryLoading();
    await Promise.all([
      loadStockSummary(selectedStock.stock_id),
      loadStockPrices(selectedStock.stock_id)
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
    renderSummary(selectedSummary);
    setStatus(selectedSummary.analysis ? '요약분석을 불러왔습니다.' : '저장된 분석 결과가 없습니다.');
  } catch (error) {
    showError(error);
    showSummaryEmpty();
  }
}

async function runSelectedStockAnalysis({ forceRefresh = false } = {}) {
  if (!selectedStock) {
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

async function loadStockPrices(stockId) {
  setPriceChartLoading();

  try {
    const result = await getStockPrices(stockId, 30);
    renderPriceChart(result.data);
  } catch {
    showPriceChartEmpty('최근 주가 데이터를 불러오지 못했습니다.');
  }
}

function setPriceChartLoading() {
  priceLatestEl.textContent = '-';
  priceChangeEl.textContent = '-';
  priceChangeEl.className = 'price-change';
  priceVolumeEl.textContent = '-';
  pricePeriodEl.textContent = '최근 30거래일';
  priceChartEl.innerHTML = '';
  priceChartEl.hidden = true;
  priceChartEmptyEl.hidden = false;
  priceChartEmptyEl.textContent = '최근 주가 데이터를 불러오는 중입니다.';
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
  priceChartEl.hidden = false;
  priceChartEmptyEl.hidden = true;
}

function showPriceChartEmpty(message) {
  priceLatestEl.textContent = '-';
  priceChangeEl.textContent = '-';
  priceChangeEl.className = 'price-change';
  priceVolumeEl.textContent = '-';
  pricePeriodEl.textContent = '최근 30거래일';
  priceChartEl.innerHTML = '';
  priceChartEl.hidden = true;
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

function showSummaryEmpty() {
  summaryEmptyEl.hidden = false;
  summaryContentEl.hidden = true;
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
  detailBenchmarkNoteEl.textContent = hasIndustryAverage
    ? `업종 평균은 ${formatMetricValue(industryAverage, unit)}입니다. 현재 값과 업종 평균을 함께 비교해 보세요.`
    : '업종 평균 데이터는 아직 준비되지 않았습니다. 현재 분석은 전년 대비 변화와 현재 재무 상태를 기준으로 판단했습니다.';
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
    authPanel.hidden = false;
    setStatus('AI 질문을 보내려면 로그인하세요.');
    return;
  }

  renderChatMessage('user', question);
  questionInput.value = '';
  questionInput.disabled = true;
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
    renderChatMessage('assistant', result.data.assistantMessage.message_text);
    await loadChatSessionsForSelectedStock();
    setStatus('AI 답변을 저장했습니다.');
  } catch (error) {
    showError(error);
  } finally {
    questionInput.disabled = false;
    questionInput.focus();
  }
}

function renderChatMessage(role, message, createdAt = null) {
  chatEmptyEl.hidden = true;
  chatTranscriptEl.hidden = false;
  chatTranscriptEl.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${escapeHtml(role)}">
      <strong>${role === 'assistant' ? 'AI 답변' : '내 질문'}</strong>
      <p>${escapeHtml(message)}</p>
      ${createdAt ? `<span>${escapeHtml(formatDateTime(createdAt))}</span>` : ''}
    </div>
  `);
  chatTranscriptEl.scrollTop = chatTranscriptEl.scrollHeight;
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
