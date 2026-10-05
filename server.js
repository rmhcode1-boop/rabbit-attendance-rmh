// Rabbit Marketing House – local / self-hosted server.
// Serves the web app from ./public and the JSON API from lib/core.js.
//   • default storage: SQLite file (data/rmh.db, Node 22.5+, no npm packages)
//   • if DATABASE_URL is set: Postgres instead (run "npm install" first)
// On Vercel the same API runs as a serverless function instead (see api/[...path].js).
const http = require('http'), fs = require('fs'), path = require('path');
const core = require('./lib/core');

const root = path.join(__dirname, 'public'), port = +process.env.PORT || 5173;
const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
const store = dbUrl
  ? require('./lib/store-pg').create(dbUrl)
  : require('./lib/store-sqlite').create(process.env.DATA_DIR || path.join(__dirname, 'data'));

const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const PUBLIC = /^\/(index\.html|css\/[\w.-]+\.css|js\/[\w.-]+\.js|assets\/[\w.-]+)$/;

http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return core.handleApi(req, res, store);
  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  if (!PUBLIC.test(p)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`Rabbit Marketing House running at http://localhost:${port}`);
  console.log(dbUrl ? 'Storage: Postgres (DATABASE_URL)' : 'Data is stored in data/rmh.db — back this file up regularly.');
});
