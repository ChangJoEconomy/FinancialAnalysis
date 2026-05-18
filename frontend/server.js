import { createReadStream, existsSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join } from 'node:path';

const port = Number(process.env.PORT || process.env.FRONTEND_PORT || 3000);
const host = process.env.HOST || process.env.FRONTEND_HOST || '127.0.0.1';
const rootDir = process.cwd();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8'
};

const server = createServer((req, res) => {
  const requestedPath = req.url === '/' ? '/index.html' : req.url || '/index.html';
  const filePath = join(rootDir, decodeURIComponent(requestedPath.split('?')[0]));

  if (!existsSync(filePath)) {
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
