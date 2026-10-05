const http = require('http');
const fs = require('fs');
const path = require('path');

const root = __dirname;
const port = Number(process.env.PORT || 4177);

const mime = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.mp3': 'audio/mpeg',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.pdf': 'application/pdf'
};

function resolvePublicPath(requestedPath) {
  let decodedPath;
  try {
    decodedPath = decodeURIComponent(String(requestedPath || ''));
  } catch (error) {
    return null;
  }

  if (decodedPath.includes('\0')) return null;
  const segments = decodedPath.split(/[\\/]+/).filter(Boolean);
  if (segments.some((segment) => segment.startsWith('.'))) return null;

  const filePath = path.resolve(root, ...segments);
  const relative = path.relative(root, filePath);
  if (
    relative === '..'
    || relative.startsWith(`..${path.sep}`)
    || path.isAbsolute(relative)
  ) {
    return null;
  }

  return filePath;
}

function createServer({ rootRedirect } = {}) {
  return http.createServer((req, res) => {
    const url = new URL(req.url, `http://127.0.0.1:${port}`);
    if (url.pathname === '/' && rootRedirect) {
      res.writeHead(302, { Location: `${rootRedirect}${url.search}`, 'Cache-Control': 'no-store' });
      res.end();
      return;
    }
    const requested = url.pathname.endsWith('/') ? `${url.pathname}index.html` : url.pathname;
    const filePath = resolvePublicPath(requested);

    if (!filePath) {
      res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (error, data) => {
      if (error) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('Not found');
        return;
      }

      res.writeHead(200, {
        'Content-Type': mime[path.extname(filePath)] || 'application/octet-stream'
      });
      res.end(data);
    });
  });
}

if (require.main === module) {
  createServer().listen(port, '127.0.0.1', () => {
    console.log(`Aleksi Lab site: http://127.0.0.1:${port}/`);
  });
}

module.exports = {
  createServer,
  resolvePublicPath
};
