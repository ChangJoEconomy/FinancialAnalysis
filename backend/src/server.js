import { createServer } from 'node:http';
import { URL } from 'node:url';
import { loadEnv } from './utils/env.js';
import { corsHeaders, sendJson, sendNotFound } from './utils/http.js';
import { handleAuthRoute } from './routes/auth.js';
import { handleHealthRoute } from './routes/health.js';
import { handleMeRoute } from './routes/me.js';
import { handleStocksRoute } from './routes/stocks.js';

loadEnv();

const port = Number(process.env.PORT || process.env.BACKEND_PORT || 4000);
const host = process.env.HOST || process.env.BACKEND_HOST || '127.0.0.1';

const server = createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (url.pathname.startsWith('/api/health')) {
    await handleHealthRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith('/api/auth')) {
    await handleAuthRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith('/api/me')) {
    await handleMeRoute(req, res, url);
    return;
  }

  if (url.pathname.startsWith('/api/stocks') || url.pathname.startsWith('/stocks')) {
    await handleStocksRoute(req, res, url);
    return;
  }

  if (url.pathname === '/') {
    sendJson(res, {
      service: 'financial-analysis-backend',
      status: 'ok',
      endpoints: [
        '/api/health',
        '/api/health/db',
        '/api/auth/signup',
        '/api/auth/login',
        '/api/auth/me',
        '/api/me/favorite-stocks',
        '/api/me/search-histories',
        '/api/me/chat-sessions',
        '/api/stocks/search?q=삼성전자',
        '/api/stocks/popular'
      ]
    });
    return;
  }

  sendNotFound(res);
});

server.listen(port, host, () => {
  console.log(`Backend server listening on http://${host}:${port}`);
});
