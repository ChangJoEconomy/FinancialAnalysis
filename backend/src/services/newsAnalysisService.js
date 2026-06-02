import { createHash } from 'node:crypto';
import {
  cacheFileExists,
  readJsonCacheFile,
  resolveCachePath,
  writeJsonCacheFile
} from '../utils/cachePaths.js';
import { findStockById } from '../repositories/stockRepository.js';
import {
  findNewsAnalysis,
  listStockNewsWithAnalyses,
  upsertNewsAnalysis,
  upsertNewsArticle,
  upsertStockNews
} from '../repositories/newsRepository.js';
import {
  getFreshCacheByLogicalKey,
  saveJsonCacheWithMetadata
} from './cacheMetadataService.js';
import { generateGeminiJson } from './geminiService.js';

const NAVER_NEWS_ENDPOINT = 'https://openapi.naver.com/v1/search/news.json';
const NEWS_PROMPT_VERSION = 'llm-news-v1';
const DEFAULT_LIMIT = 5;
const DEFAULT_SEARCH_DISPLAY = 10;
const CACHE_HOURS = 6;

export async function getStockNews({ stockId, limit = DEFAULT_LIMIT }) {
  const stock = await requireStock(stockId);
  const normalizedLimit = parseLimit(limit);
  const rows = await listStockNewsWithAnalyses(stock.stock_id, normalizedLimit);

  return {
    stock,
    news: rows.map(normalizeStoredStockNews)
  };
}

export async function collectAndAnalyzeStockNews({
  stockId,
  limit = DEFAULT_LIMIT,
  forceRefresh = false
}) {
  const stock = await requireStock(stockId);
  const normalizedLimit = parseLimit(limit);
  const rawResult = await collectNaverNewsRaw({
    stock,
    forceRefresh,
    display: Math.max(DEFAULT_SEARCH_DISPLAY, normalizedLimit)
  });
  const normalizedArticles = normalizeNaverNewsItems(rawResult.data.items || [])
    .slice(0, normalizedLimit);
  const savedArticles = [];

  for (const article of normalizedArticles) {
    const relevance = calculateRelevance(stock, article);
    const savedArticle = await upsertNewsArticle({
      ...article,
      raw_cache_file_id: rawResult.cacheMetadata?.cache_file_id || null
    });
    const savedStockNews = await upsertStockNews({
      stock_id: stock.stock_id,
      news_id: savedArticle.news_id,
      relevance_score: relevance.score,
      matched_keywords: relevance.keywords
    });

    savedArticles.push({
      stockNews: savedStockNews,
      article: savedArticle
    });
  }

  const analysisResult = await analyzeAndSaveNewsBatch({ stock, savedArticles, forceRefresh });

  return {
    cacheHit: rawResult.cacheHit,
    source: rawResult.source,
    stock,
    rawCache: {
      logicalKey: rawResult.logicalKey,
      filePath: rawResult.cacheMetadata?.file_path || rawResult.filePath,
      metadataWarning: rawResult.metadataWarning || null
    },
    collectedCount: savedArticles.length,
    analyzedCount: analysisResult.saved.length,
    llm: analysisResult.llm,
    ...(await getStockNews({ stockId: stock.stock_id, limit: normalizedLimit }))
  };
}

export async function collectNaverNewsRaw({ stock, display = DEFAULT_SEARCH_DISPLAY, forceRefresh = false }) {
  const date = formatDateInSeoul(new Date());
  const logicalKey = `NAVER:news_search:${stock.stock_code}:${date}`;
  const cachePathSegments = ['news', stock.stock_code, `${date}.json`];
  const absoluteCachePath = resolveCachePath(...cachePathSegments);

  if (!forceRefresh) {
    const cached = await tryReadFreshCache({ logicalKey, absoluteCachePath });
    if (cached) {
      return {
        cacheHit: true,
        source: cached.source,
        logicalKey,
        cacheMetadata: cached.cacheMetadata,
        data: cached.data
      };
    }
  }

  const data = await fetchNaverNewsSearchRaw({
    query: stock.company_name_ko,
    display
  });
  let cacheMetadata = null;
  let metadataWarning = null;

  try {
    cacheMetadata = await saveJsonCacheWithMetadata({
      provider: 'NAVER',
      cacheType: 'news_raw',
      targetType: 'news',
      targetId: `${stock.stock_code}:${date}`,
      stockId: stock.stock_id,
      logicalKey,
      cachePathSegments,
      data,
      rowCount: data.items?.length || 0,
      periodStart: date,
      periodEnd: date,
      expiresAt: addHours(new Date(), CACHE_HOURS).toISOString(),
      metadata: {
        stock_code: stock.stock_code,
        query: stock.company_name_ko,
        endpoint: '/v1/search/news.json',
        sort: 'date'
      }
    });
  } catch (error) {
    metadataWarning = error.message;
    writeJsonCacheFile(absoluteCachePath, data);
  }

  return {
    cacheHit: false,
    source: 'naver_api',
    logicalKey,
    cacheMetadata,
    filePath: `data-cache/news/${stock.stock_code}/${date}.json`,
    metadataWarning,
    data
  };
}

export async function fetchNaverNewsSearchRaw({ query, display = DEFAULT_SEARCH_DISPLAY }) {
  const url = new URL(NAVER_NEWS_ENDPOINT);
  url.search = new URLSearchParams({
    query,
    display: String(display),
    start: '1',
    sort: 'date'
  }).toString();
  let response;

  try {
    response = await fetch(url, {
      headers: {
        'X-Naver-Client-Id': requireEnv('NAVER_CLIENT_ID'),
        'X-Naver-Client-Secret': requireEnv('NAVER_CLIENT_SECRET')
      }
    });
  } catch (error) {
    throw Object.assign(new Error(`Naver News API network request failed: ${error.message}`), {
      statusCode: 503,
      cause: error
    });
  }

  const data = await readJson(response);
  if (!response.ok) {
    throw Object.assign(new Error(data.errorMessage || `Naver News API request failed: ${response.status}`), {
      statusCode: response.status,
      details: data
    });
  }

  return data;
}

export function normalizeNaverNewsItems(items) {
  return items.map((item) => {
    const contentUrl = item.originallink || item.link;
    const title = cleanNaverText(item.title);
    const summary = cleanNaverText(item.description);

    return {
      external_news_id: hash(contentUrl).slice(0, 40),
      title,
      summary,
      content_url: contentUrl,
      publisher: getHostname(contentUrl),
      published_at: toIsoDate(item.pubDate),
      source_provider: 'NAVER',
      content_hash: hash(JSON.stringify({ title, summary, contentUrl }))
    };
  }).filter((article) => article.content_url && article.title);
}

async function analyzeAndSaveNewsBatch({ stock, savedArticles, forceRefresh }) {
  if (!savedArticles.length) {
    return {
      llm: { fallback: false, model: null, error: null },
      saved: []
    };
  }

  if (!forceRefresh) {
    const cachedAnalyses = await Promise.all(
      savedArticles.map(({ stockNews }) => findNewsAnalysis({
        stockNewsId: stockNews.stock_news_id,
        promptVersion: NEWS_PROMPT_VERSION
      }))
    );

    if (cachedAnalyses.every(Boolean)) {
      return {
        llm: {
          cached: true,
          fallback: false,
          model: cachedAnalyses[0].model_name,
          finishReason: null,
          usageMetadata: null,
          error: null
        },
        saved: cachedAnalyses
      };
    }
  }

  const prompt = buildNewsAnalysisPrompt({ stock, savedArticles });
  let llm;
  let analyses;

  try {
    const result = await generateGeminiJson({ prompt, temperature: 0.1 });
    llm = {
      cached: false,
      fallback: false,
      model: result.model,
      finishReason: result.finishReason,
      usageMetadata: result.usageMetadata,
      error: null
    };
    analyses = normalizeGeminiNewsAnalyses(result.json, savedArticles);
  } catch (error) {
    llm = {
      cached: false,
      fallback: true,
      model: 'rules-news-v1-fallback',
      finishReason: null,
      usageMetadata: null,
      error: error.message
    };
    analyses = savedArticles.map(({ stockNews, article }) => (
      buildFallbackNewsAnalysis(stockNews.stock_news_id, article)
    ));
  }

  const saved = [];
  for (const analysis of analyses) {
    saved.push(await upsertNewsAnalysis({
      ...analysis,
      prompt_version: NEWS_PROMPT_VERSION,
      model_name: llm.model
    }));
  }

  return { llm, saved };
}

function buildNewsAnalysisPrompt({ stock, savedArticles }) {
  return [
    '당신은 초보 투자자를 위한 한국 주식 뉴스 해설 도우미입니다.',
    '제공된 기사 제목과 요약만 사용하여 종목에 미칠 수 있는 영향을 분류하세요.',
    '매수, 매도, 보유를 지시하지 마세요. 확정적인 수익 전망이나 목표가를 제시하지 마세요.',
    '기사 정보가 부족하면 neutral, gray, unknown을 사용하세요.',
    '반드시 JSON만 반환하세요.',
    '',
    `종목: ${stock.company_name_ko} (${stock.stock_code})`,
    '기사 목록:',
    JSON.stringify(savedArticles.map(({ stockNews, article }, index) => ({
      article_index: index,
      stock_news_id: stockNews.stock_news_id,
      title: article.title,
      summary: article.summary,
      publisher: article.publisher,
      published_at: article.published_at
    })), null, 2),
    '',
    '응답 형식:',
    '{',
    '  "analyses": [',
    '    {',
    '      "article_index": 0,',
    '      "sentiment": "positive | negative | neutral | mixed",',
    '      "impact_signal": "green | orange | red | gray",',
    '      "impact_term": "short_term | mid_term | long_term | unknown",',
    '      "impact_summary": "80자 이내 초보자용 영향 요약",',
    '      "reason_text": "기사 내용에 근거한 판단 이유",',
    '      "risk_keywords": ["확인할 키워드"]',
    '    }',
    '  ]',
    '}'
  ].join('\n');
}

function normalizeGeminiNewsAnalyses(json, savedArticles) {
  const byIndex = new Map(
    (Array.isArray(json?.analyses) ? json.analyses : [])
      .map((analysis) => [Number(analysis.article_index), analysis])
  );

  return savedArticles.map(({ stockNews, article }, index) => {
    const analysis = byIndex.get(index);
    if (!analysis) {
      return buildFallbackNewsAnalysis(stockNews.stock_news_id, article);
    }

    return {
      stock_news_id: stockNews.stock_news_id,
      sentiment: enumValue(analysis.sentiment, ['positive', 'negative', 'neutral', 'mixed'], 'neutral'),
      impact_signal: enumValue(analysis.impact_signal, ['green', 'orange', 'red', 'gray'], 'gray'),
      impact_term: enumValue(analysis.impact_term, ['short_term', 'mid_term', 'long_term', 'unknown'], 'unknown'),
      impact_summary: textValue(analysis.impact_summary, '기사 내용을 추가로 확인해야 합니다.'),
      reason_text: textValue(analysis.reason_text, article.summary || article.title),
      risk_keywords: arrayOfText(analysis.risk_keywords)
    };
  });
}

function buildFallbackNewsAnalysis(stockNewsId, article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const negative = ['감소', '하락', '적자', '리스크', '우려', '소송', '제재', '부진', '급락'];
  const positive = ['증가', '성장', '개선', '확대', '수주', '흑자', '상승', '호조', '돌파'];
  const negativeMatches = negative.filter((keyword) => text.includes(keyword));
  const positiveMatches = positive.filter((keyword) => text.includes(keyword));
  const sentiment = negativeMatches.length > positiveMatches.length
    ? 'negative'
    : positiveMatches.length > negativeMatches.length
      ? 'positive'
      : 'neutral';

  return {
    stock_news_id: stockNewsId,
    sentiment,
    impact_signal: sentiment === 'negative' ? 'red' : sentiment === 'positive' ? 'green' : 'gray',
    impact_term: 'unknown',
    impact_summary: '제목과 요약만으로 분류한 임시 결과입니다. 기사 원문을 함께 확인하세요.',
    reason_text: article.summary || article.title,
    risk_keywords: [...new Set([...negativeMatches, ...positiveMatches])].slice(0, 5)
  };
}

function normalizeStoredStockNews(row) {
  const analyses = [...(row.news_ai_analyses || [])]
    .sort((left, right) => String(right.created_at).localeCompare(String(left.created_at)));

  return {
    stock_news_id: row.stock_news_id,
    relevance_score: row.relevance_score,
    matched_keywords: row.matched_keywords || [],
    article: row.news_articles,
    analysis: analyses.find((analysis) => analysis.prompt_version === NEWS_PROMPT_VERSION) || analyses[0] || null
  };
}

function calculateRelevance(stock, article) {
  const text = `${article.title} ${article.summary}`.toLowerCase();
  const candidates = [
    stock.company_name_ko,
    stock.stock_code,
    stock.company_name_en
  ].filter(Boolean);
  const keywords = candidates.filter((keyword) => text.includes(String(keyword).toLowerCase()));

  return {
    score: keywords.includes(stock.company_name_ko) ? 100 : keywords.length ? 90 : 70,
    keywords
  };
}

async function tryReadFreshCache({ logicalKey, absoluteCachePath }) {
  try {
    const metadata = await getFreshCacheByLogicalKey(logicalKey);
    if (metadata && cacheFileExists(absoluteCachePath)) {
      return {
        source: 'metadata_cache',
        cacheMetadata: metadata,
        data: readJsonCacheFile(absoluteCachePath)
      };
    }
  } catch {
    if (cacheFileExists(absoluteCachePath)) {
      return {
        source: 'file_cache',
        cacheMetadata: null,
        data: readJsonCacheFile(absoluteCachePath)
      };
    }
  }

  return null;
}

async function requireStock(stockId) {
  const normalizedStockId = Number(stockId);
  if (!Number.isInteger(normalizedStockId) || normalizedStockId <= 0) {
    throw Object.assign(new Error('stockId must be a positive integer.'), { statusCode: 400 });
  }

  const stock = await findStockById(normalizedStockId);
  if (!stock) {
    throw Object.assign(new Error('Stock not found.'), { statusCode: 404 });
  }

  return stock;
}

function parseLimit(value) {
  const limit = Number(value || DEFAULT_LIMIT);
  if (!Number.isInteger(limit) || limit <= 0 || limit > 10) {
    throw Object.assign(new Error('limit must be an integer between 1 and 10.'), { statusCode: 400 });
  }

  return limit;
}

function cleanNaverText(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();
}

function getHostname(value) {
  try {
    return new URL(value).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

function toIsoDate(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function formatDateInSeoul(date) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function addHours(date, hours) {
  return new Date(date.getTime() + 1000 * 60 * 60 * hours);
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw Object.assign(new Error(`Missing required environment variable: ${name}`), { statusCode: 500 });
  }

  return value;
}

function enumValue(value, values, fallback) {
  return values.includes(value) ? value : fallback;
}

function textValue(value, fallback) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function arrayOfText(value) {
  return Array.isArray(value)
    ? value.filter((item) => typeof item === 'string' && item.trim()).map((item) => item.trim()).slice(0, 8)
    : [];
}

async function readJson(response) {
  const text = await response.text();
  return text ? JSON.parse(text) : {};
}
