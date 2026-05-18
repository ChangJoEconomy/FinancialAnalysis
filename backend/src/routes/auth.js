import { login, logout, me, signup } from '../services/authService.js';
import { getBearerToken } from '../utils/authContext.js';
import { readJsonBody, sendError, sendJson } from '../utils/http.js';

export async function handleAuthRoute(req, res, url) {
  try {
    if (req.method === 'POST' && url.pathname === '/api/auth/signup') {
      const body = await readJsonBody(req);
      sendJson(res, await signup(body), 201);
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/login') {
      const body = await readJsonBody(req);
      sendJson(res, await login(body));
      return;
    }

    if (req.method === 'GET' && url.pathname === '/api/auth/me') {
      sendJson(res, await me(getBearerToken(req)));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/auth/logout') {
      sendJson(res, await logout(getBearerToken(req)));
      return;
    }

    sendError(res, 404, 'NOT_FOUND', 'Unknown auth endpoint.');
  } catch (error) {
    sendError(
      res,
      error.statusCode || 500,
      error.statusCode ? 'AUTH_ERROR' : 'INTERNAL_SERVER_ERROR',
      error.message
    );
  }
}
