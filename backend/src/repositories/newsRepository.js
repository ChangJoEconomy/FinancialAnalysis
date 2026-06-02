import { requestSupabaseRest } from './supabaseRestRepository.js';

const NEWS_ARTICLE_SELECT = [
  'news_id',
  'external_news_id',
  'title',
  'summary',
  'content_url',
  'publisher',
  'published_at',
  'source_provider',
  'content_hash',
  'raw_cache_file_id',
  'fetched_at'
].join(',');

const NEWS_ANALYSIS_SELECT = [
  'news_analysis_id',
  'stock_news_id',
  'sentiment',
  'impact_signal',
  'impact_term',
  'impact_summary',
  'reason_text',
  'risk_keywords',
  'model_name',
  'prompt_version',
  'created_at'
].join(',');

export async function findNewsArticleByUrl(contentUrl) {
  const rows = await requestSupabaseRest(
    `news_articles?select=${NEWS_ARTICLE_SELECT}&content_url=eq.${encodeURIComponent(contentUrl)}&limit=1`
  );

  return rows[0] || null;
}

export async function upsertNewsArticle(article) {
  const existing = await findNewsArticleByUrl(article.content_url);
  if (existing) {
    return updateNewsArticle(existing.news_id, article);
  }

  const rows = await requestSupabaseRest('news_articles', {
    method: 'POST',
    prefer: 'return=representation',
    body: article
  });

  return rows[0];
}

export async function updateNewsArticle(newsId, patch) {
  const rows = await requestSupabaseRest(`news_articles?news_id=eq.${Number(newsId)}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: {
      external_news_id: patch.external_news_id,
      title: patch.title,
      summary: patch.summary,
      publisher: patch.publisher,
      published_at: patch.published_at,
      source_provider: patch.source_provider,
      content_hash: patch.content_hash,
      raw_cache_file_id: patch.raw_cache_file_id ?? null,
      fetched_at: new Date().toISOString()
    }
  });

  return rows[0];
}

export async function findStockNews({ stockId, newsId }) {
  const rows = await requestSupabaseRest(
    `stock_news?select=stock_news_id,stock_id,news_id,relevance_score,matched_keywords,created_at` +
      `&stock_id=eq.${Number(stockId)}` +
      `&news_id=eq.${Number(newsId)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function upsertStockNews(stockNews) {
  const existing = await findStockNews({
    stockId: stockNews.stock_id,
    newsId: stockNews.news_id
  });
  if (existing) {
    const rows = await requestSupabaseRest(`stock_news?stock_news_id=eq.${existing.stock_news_id}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        relevance_score: stockNews.relevance_score,
        matched_keywords: stockNews.matched_keywords
      }
    });
    return rows[0];
  }

  const rows = await requestSupabaseRest('stock_news', {
    method: 'POST',
    prefer: 'return=representation',
    body: stockNews
  });

  return rows[0];
}

export async function findNewsAnalysis({ stockNewsId, promptVersion }) {
  const rows = await requestSupabaseRest(
    `news_ai_analyses?select=${NEWS_ANALYSIS_SELECT}` +
      `&stock_news_id=eq.${Number(stockNewsId)}` +
      `&prompt_version=eq.${encodeURIComponent(promptVersion)}` +
      '&limit=1'
  );

  return rows[0] || null;
}

export async function upsertNewsAnalysis(analysis) {
  const existing = await findNewsAnalysis({
    stockNewsId: analysis.stock_news_id,
    promptVersion: analysis.prompt_version
  });
  if (existing) {
    const rows = await requestSupabaseRest(`news_ai_analyses?news_analysis_id=eq.${existing.news_analysis_id}`, {
      method: 'PATCH',
      prefer: 'return=representation',
      body: {
        sentiment: analysis.sentiment,
        impact_signal: analysis.impact_signal,
        impact_term: analysis.impact_term,
        impact_summary: analysis.impact_summary,
        reason_text: analysis.reason_text,
        risk_keywords: analysis.risk_keywords,
        model_name: analysis.model_name,
        created_at: new Date().toISOString()
      }
    });
    return rows[0];
  }

  const rows = await requestSupabaseRest('news_ai_analyses', {
    method: 'POST',
    prefer: 'return=representation',
    body: analysis
  });

  return rows[0];
}

export async function listStockNewsWithAnalyses(stockId, limit = 5) {
  return requestSupabaseRest(
    'stock_news?' +
      `select=stock_news_id,stock_id,news_id,relevance_score,matched_keywords,created_at,news_articles(${NEWS_ARTICLE_SELECT}),news_ai_analyses(${NEWS_ANALYSIS_SELECT})` +
      `&stock_id=eq.${Number(stockId)}` +
      '&order=created_at.desc' +
      `&limit=${Number(limit)}`
  );
}
