import { getPopularStocks, searchStocks } from '../services/stockSearchService.js';
import {
  analyzeStock,
  getStockDetail,
  getStockFinancials,
  getStockSummary
} from '../services/stockAnalysisService.js';
import { createSearchHistory } from '../services/userDataService.js';
import { collectKiwoomDailyPrices, getRecentStockPrices } from '../services/stockPriceService.js';
import { collectAndAnalyzeStockNews, getStockNews } from '../services/newsAnalysisService.js';
import { getOptionalAuthContext, requireAuthContext } from '../utils/authContext.js';
import { readJsonBody, sendError, sendJson } from '../utils/http.js';

export async function handleStocksRoute(req, res, url) {
  try {
    if (req.method === 'GET' && isSearchPath(url.pathname)) {
      const query = url.searchParams.get('q');
      const limit = url.searchParams.get('limit') || 20;
      sendJson(res, await searchStocks(query, limit));
      return;
    }

    if (req.method === 'GET' && isPopularPath(url.pathname)) {
      const limit = url.searchParams.get('limit') || 5;
      sendJson(res, await getPopularStocks(limit));
      return;
    }

    if (req.method === 'POST' && isSearchClickPath(url.pathname)) {
      const authContext = await requireAuthContext(req);
      const body = await readJsonBody(req);
      sendJson(res, { data: await createSearchHistory(authContext, body) }, 201);
      return;
    }

    const stockPath = matchStockPath(url.pathname);
    if (stockPath) {
      const { stockId, resource } = stockPath;

      if (req.method === 'GET' && !resource) {
        sendJson(res, { data: await getStockDetail(stockId) });
        return;
      }

      if (req.method === 'GET' && resource === 'summary') {
        const authContext = await getOptionalAuthContext(req);
        sendJson(res, { data: await getStockSummary({ stockId, authContext }) });
        return;
      }

      if (req.method === 'POST' && resource === 'analyze') {
        const authContext = await requireAuthContext(req);
        const body = await readJsonBody(req);
        sendJson(res, { data: await analyzeStock({ stockId, authContext, payload: body }) });
        return;
      }

      if (req.method === 'GET' && resource === 'financials') {
        sendJson(res, {
          data: await getStockFinancials({
            stockId,
            fiscalYear: url.searchParams.get('fiscalYear') || 2024
          })
        });
        return;
      }

      if (req.method === 'GET' && resource === 'prices') {
        sendJson(res, {
          data: await getRecentStockPrices({
            stockId,
            days: url.searchParams.get('days') || 30
          })
        });
        return;
      }

      if (req.method === 'POST' && resource === 'prices/collect') {
        await requireAuthContext(req);
        const body = await readJsonBody(req);
        const collection = await collectKiwoomDailyPrices({
          stockId,
          recentDays: body.recentDays || 90,
          forceRefresh: Boolean(body.forceRefresh)
        });
        sendJson(res, {
          data: {
            collection,
            ...(await getRecentStockPrices({
              stockId,
              days: body.days || 30
            }))
          }
        });
        return;
      }

      if (req.method === 'GET' && resource === 'news') {
        sendJson(res, {
          data: await getStockNews({
            stockId,
            limit: url.searchParams.get('limit') || 5
          })
        });
        return;
      }

      if (req.method === 'POST' && resource === 'news/refresh') {
        await requireAuthContext(req);
        const body = await readJsonBody(req);
        sendJson(res, {
          data: await collectAndAnalyzeStockNews({
            stockId,
            limit: body.limit || 5,
            forceRefresh: Boolean(body.forceRefresh)
          })
        });
        return;
      }
    }

    sendError(res, 404, 'NOT_FOUND', 'Unknown stocks endpoint.');
  } catch (error) {
    sendError(
      res,
      error.statusCode || 500,
      error.statusCode ? 'STOCK_SEARCH_ERROR' : 'INTERNAL_SERVER_ERROR',
      error.message
    );
  }
}

function matchStockPath(pathname) {
  const match = pathname.match(/^\/(?:api\/)?stocks\/(\d+)(?:\/(summary|analyze|financials|prices|prices\/collect|news|news\/refresh))?$/);
  if (!match) {
    return null;
  }

  return {
    stockId: Number(match[1]),
    resource: match[2] || null
  };
}

function isSearchPath(pathname) {
  return pathname === '/api/stocks/search' || pathname === '/stocks/search';
}

function isSearchClickPath(pathname) {
  return pathname === '/api/stocks/search-click' || pathname === '/stocks/search-click';
}

function isPopularPath(pathname) {
  return pathname === '/api/stocks/popular' || pathname === '/stocks/popular';
}
