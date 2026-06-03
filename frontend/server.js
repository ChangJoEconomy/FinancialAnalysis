import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { dirname, extname, isAbsolute, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 3000);
const host = process.env.HOST || process.env.FRONTEND_HOST || '127.0.0.1';
const rootDir = dirname(fileURLToPath(import.meta.url));

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer((req, res) => {
  const requestedPath = req.url === '/' ? '/index.html' : req.url || '/index.html';
  const decodedPath = decodePath(requestedPath.split('?')[0]);
  if (!decodedPath) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Invalid path');
    return;
  }

  const filePath = resolve(rootDir, `.${decodedPath}`);
  const relativePath = relative(rootDir, filePath);

  if (relativePath.startsWith('..') || isAbsolute(relativePath) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not found');
    return;
  }

  res.writeHead(200, {
    'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream'
  });
  createReadStream(filePath).pipe(res);
});

server.listen(port, host, () => {
  console.log(`Frontend server listening on http://${host}:${port}`);
});

function decodePath(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return null;
  }
}
