import { createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const frontendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../frontend');
const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon'
};

export function serveFrontendFile(req, res, url) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return false;
  }

  const requestedPath = decodePathname(isFrontendRoute(url.pathname) ? '/index.html' : url.pathname);
  if (!requestedPath) {
    sendText(res, 400, 'Invalid path');
    return true;
  }

  const filePath = resolve(frontendRoot, `.${requestedPath}`);
  const relativePath = relative(frontendRoot, filePath);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    sendText(res, 404, 'Not found');
    return true;
  }

  if (!existsSync(filePath) || !statSync(filePath).isFile()) {
    return false;
  }

  res.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });

  if (req.method === 'HEAD') {
    res.end();
    return true;
  }

  createReadStream(filePath).pipe(res);
  return true;
}

function isFrontendRoute(pathname) {
  return pathname === '/'
    || /^\/(?:home|favorites|login|signup|account)$/.test(pathname)
    || pathname === '/search'
    || /^\/summary\/\d+$/.test(pathname);
}

function decodePathname(pathname) {
  try {
    return decodeURIComponent(pathname);
  } catch {
    return null;
  }
}

function sendText(res, statusCode, message) {
  res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(message);
}
