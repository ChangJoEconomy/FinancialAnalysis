import { searchStocks } from '../services/stockSearchService.js';
import { createSearchHistory } from '../services/userDataService.js';
import { requireAuthContext } from '../utils/authContext.js';
import { readJsonBody, sendError, sendJson } from '../utils/http.js';

export async function handleStocksRoute(req, res, url) {
  try {
    if (req.method === 'GET' && isSearchPath(url.pathname)) {
      const query = url.searchParams.get('q');
      const limit = url.searchParams.get('limit') || 20;
      sendJson(res, await searchStocks(query, limit));
      return;
    }

    if (req.method === 'POST' && isSearchClickPath(url.pathname)) {
      const authContext = await requireAuthContext(req);
      const body = await readJsonBody(req);
      sendJson(res, { data: await createSearchHistory(authContext, body) }, 201);
      return;
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

function isSearchPath(pathname) {
  return pathname === '/api/stocks/search' || pathname === '/stocks/search';
}

function isSearchClickPath(pathname) {
  return pathname === '/api/stocks/search-click' || pathname === '/stocks/search-click';
}
