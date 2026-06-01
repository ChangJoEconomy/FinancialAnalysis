import {
  addFavoriteStock,
  analyzeStock,
  clearAccessToken,
  createChatSession,
  getMe,
  getPopularStocks,
  getSearchHistories,
  getStockDetail,
  getStockSummary,
  getStoredAccessToken,
  login,
  logout,
  recordStockSearchClick,
  searchStocks,
  sendChatMessage,
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
const chatTranscriptEl = document.querySelector('[data-chat-transcript]');

let lastSearchQuery = '';
let lastSearchResultCount = 0;
let lastSearchResults = [];
let selectedStock = null;
let selectedSummary = null;
let chatSessionId = null;
let selectedMetricCode = null;

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

  setStatus('관심종목에 추가하는 중...');

  try {
    await addFavoriteStock({ stockId: Number(selectedStock.stock_id) });
    favoriteButton.textContent = '관심종목 추가됨';
    setStatus('관심종목에 추가했습니다.');
  } catch (error) {
    showError(error);
  }
});

questionForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  await askQuestion(questionInput.value);
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
  chatSessionId = null;
  selectedMetricCode = null;
  enterSummaryView(stock);
  setSummaryLoading();

  const tasks = [loadStockSummary(stock.stock_id)];
  if (getStoredAccessToken()) {
    tasks.push(saveSearchSelection(stock));
  }

  await Promise.all(tasks);
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

function enterSummaryView(stock) {
  summaryNameEl.textContent = `${stock.company_name_ko} 요약분석`;
  summaryMetaEl.textContent = `${stock.stock_code} · ${stock.ticker} · ${stock.market} · ${stock.industry_name || '업종 정보 없음'}`;
  document.body.classList.add('summary-mode');
  homeDashboard.hidden = true;
  summaryPanel.hidden = false;
  stockSearchResultsEl.innerHTML = '';
  window.location.hash = `summary-${stock.stock_id}`;
  summaryPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeSummary() {
  selectedStock = null;
  selectedSummary = null;
  chatSessionId = null;
  document.body.classList.remove('summary-mode');
  summaryPanel.hidden = true;
  homeDashboard.hidden = false;
  chatTranscriptEl.hidden = true;
  chatTranscriptEl.innerHTML = '';
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
    enterSummaryView(selectedStock);
    setSummaryLoading();
    await loadStockSummary(selectedStock.stock_id);
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
    setStatus('AI 답변을 저장했습니다.');
  } catch (error) {
    showError(error);
  } finally {
    questionInput.disabled = false;
    questionInput.focus();
  }
}

function renderChatMessage(role, message) {
  chatTranscriptEl.hidden = false;
  chatTranscriptEl.insertAdjacentHTML('beforeend', `
    <div class="chat-message ${escapeHtml(role)}">${escapeHtml(message)}</div>
  `);
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
