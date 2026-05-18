import {
  createFavoriteStock,
  createSearchHistory,
  deleteFavoriteStock,
  getChatMessages,
  getChatSessions,
  getFavoriteStocks,
  getSearchHistories
} from '../services/userDataService.js';
import { requireAuthContext } from '../utils/authContext.js';
import { readJsonBody, sendError, sendJson } from '../utils/http.js';

export async function handleMeRoute(req, res, url) {
  try {
    const authContext = await requireAuthContext(req);

    if (req.method === 'GET' && url.pathname === '/api/me/favorite-stocks') {
      sendJson(res, { data: await getFavoriteStocks(authContext) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/me/favorite-stocks') {
      const body = await readJsonBody(req);
      sendJson(res, { data: await createFavoriteStock(authContext, body) }, 201);
      return;
    }

    if (req.method === 'DELETE' && url.pathname.startsWith('/api/me/favorite-stocks/')) {
      const favoriteId = url.pathname.split('/').at(-1);
      sendJson(res, await deleteFavoriteStock(authContext, favoriteId));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/me/search-histories') {
      sendJson(res, { data: await getSearchHistories(authContext, url.searchParams.get('limit')) });
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/me/search-histories') {
      const body = await readJsonBody(req);
      sendJson(res, { data: await createSearchHistory(authContext, body) }, 201);
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/me/chat-sessions') {
      sendJson(res, { data: await getChatSessions(authContext, url.searchParams.get('limit')) });
      return;
    }

    if (req.method === 'GET' && url.pathname.startsWith('/api/me/chat-sessions/')) {
      const [, , , , chatSessionId, childResource] = url.pathname.split('/');

      if (childResource === 'messages') {
        sendJson(res, { data: await getChatMessages(authContext, chatSessionId) });
        return;
      }
    }

    sendError(res, 404, 'NOT_FOUND', 'Unknown user-scoped endpoint.');
  } catch (error) {
    sendError(
      res,
      error.statusCode || 500,
      error.statusCode ? 'USER_DATA_ERROR' : 'INTERNAL_SERVER_ERROR',
      error.message
    );
  }
}
