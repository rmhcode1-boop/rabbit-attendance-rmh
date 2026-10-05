// Vercel serverless entry for every /api/* request. Storage: Postgres (Neon) via DATABASE_URL / POSTGRES_URL.
const core = require('../lib/core');

let store = null;
function getStore() {
  if (store) return store;
  const url = process.env.DATABASE_URL || process.env.POSTGRES_URL
    || Object.values(process.env).find(v => typeof v === 'string' && (v.startsWith('postgres://') || v.startsWith('postgresql://'))); // any variable holding a Postgres address
  if (!url) return null;
  store = require('../lib/store-pg').create(url);
  return store;
}

module.exports = async (req, res) => {
  const s = getStore();
  if (!s) {
    res.writeHead(503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({ error: 'Database not configured. Add a Postgres database (DATABASE_URL) to this project.' }));
  }
  return core.handleApi(req, res, s);
};
