import { createServer } from 'node:http';
import { URL } from 'node:url';
import { loadEnv } from './utils/env.js';
import { corsHeaders, sendJson, sendNotFound } from './utils/http.js';
import { handleAuthRoute } from './routes/auth.js';
import { handleHealthRoute } from './routes/health.js';
import { handleMeRoute } from './routes/me.js';
import { handleStocksRoute } from './routes/stocks.js';
import { serveFrontendFile } from './utils/staticFiles.js';

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

  if (url.pathname === '/api') {
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
        '/api/me/analysis-settings',
        '/api/me/chat-sessions',
        '/api/stocks/search?q=삼성전자',
        '/api/stocks/popular',
        '/api/stocks/1',
        '/api/stocks/1/summary',
        '/api/stocks/1/analyze',
        '/api/stocks/1/financials?fiscalYear=2024',
        '/api/stocks/1/prices?days=30',
        '/api/stocks/1/prices/collect',
        '/api/stocks/1/news?limit=5',
        '/api/stocks/1/news/refresh'
      ]
    });
    return;
  }

  if (serveFrontendFile(req, res, url)) {
    return;
  }

  sendNotFound(res);
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${host}:${port} is already in use.`);
    console.error('Stop the existing server or run with a different PORT/BACKEND_PORT.');
    process.exit(1);
  }

  throw error;
});

server.listen(port, host, () => {
  console.log(`Backend server listening on http://${host}:${port}`);
});
