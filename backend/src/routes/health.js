import { checkSupabaseConnection } from '../services/supabaseHealthService.js';
import { sendJson, sendError } from '../utils/http.js';

export async function handleHealthRoute(req, res, url) {
  if (req.method !== 'GET') {
    sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Only GET is supported for health checks.');
    return;
  }

  if (url.pathname === '/api/health') {
    sendJson(res, {
      status: 'ok',
      service: 'financial-analysis-backend'
    });
    return;
  }

  if (url.pathname === '/api/health/db') {
    const result = await checkSupabaseConnection();
    sendJson(res, result.ok ? result : { ...result, status: 'error' }, result.ok ? 200 : 500);
    return;
  }

  sendError(res, 404, 'NOT_FOUND', 'Unknown health endpoint.');
}
