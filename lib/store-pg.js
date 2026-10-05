// Postgres storage (Vercel + Neon, or any Postgres). Needs the "pg" package.
const { compact } = require('./compact');

exports.create = function createPgStore(url) {
  const { Pool } = require('pg');
  const local = /localhost|127\.0\.0\.1/.test(url);
  const pool = new Pool({ connectionString: url, max: +process.env.PG_POOL_MAX || 3, idleTimeoutMillis: 10000, ssl: local ? false : { rejectUnauthorized: false } });
  let ready = null;
  const init = () => ready || (ready = pool.query(`
CREATE TABLE IF NOT EXISTS docs(coll TEXT NOT NULL,id TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(coll,id));
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(emp TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resets(hash TEXT PRIMARY KEY,emp TEXT NOT NULL,exp BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,emp TEXT NOT NULL,exp BIGINT NOT NULL,seen BIGINT NOT NULL);`).catch(e => { ready = null; throw e; }));
  const OPS = {
    docPut: (c, id, j) => ['INSERT INTO docs(coll,id,json) VALUES($1,$2,$3) ON CONFLICT(coll,id) DO UPDATE SET json=EXCLUDED.json', [c, id, j]],
    docDel: (c, id) => ['DELETE FROM docs WHERE coll=$1 AND id=$2', [c, id]],
    kvSet: (k, j) => ['INSERT INTO kv(k,v) VALUES($1,$2) ON CONFLICT(k) DO UPDATE SET v=EXCLUDED.v', [k, j]],
    userUpsert: r => ['INSERT INTO users(emp,email,salt,hash) VALUES($1,$2,$3,$4) ON CONFLICT(emp) DO UPDATE SET email=EXCLUDED.email,salt=EXCLUDED.salt,hash=EXCLUDED.hash', [r.emp, r.email, r.salt, r.hash]],
    userEmail: (emp, email) => ['UPDATE users SET email=$1 WHERE emp=$2', [email, emp]],
    sessPut: r => ['INSERT INTO sessions(token,emp,exp,seen) VALUES($1,$2,$3,$4) ON CONFLICT(token) DO UPDATE SET seen=EXCLUDED.seen', [r.token, r.emp, r.exp, r.seen]],
    sessTouch: (t, seen) => ['UPDATE sessions SET seen=$1 WHERE token=$2', [seen, t]],
    sessDelToken: t => ['DELETE FROM sessions WHERE token=$1', [t]],
    sessDelEmp: emp => ['DELETE FROM sessions WHERE emp=$1', [emp]],
    resetPut: r => ['INSERT INTO resets(hash,emp,exp) VALUES($1,$2,$3) ON CONFLICT(hash) DO UPDATE SET exp=EXCLUDED.exp', [r.hash, r.emp, r.exp]],
    resetDelEmp: emp => ['DELETE FROM resets WHERE emp=$1', [emp]],
  };
  const num = v => Number(v);
  return {
    async load() {
      await init();
      const now = Date.now();
      const [d, k, u, s, r] = await Promise.all([
        pool.query('SELECT coll,id,json FROM docs'), pool.query('SELECT k,v FROM kv'), pool.query('SELECT emp,email,salt,hash FROM users'),
        pool.query('SELECT token,emp,exp,seen FROM sessions WHERE exp>$1', [now]), pool.query('SELECT hash,emp,exp FROM resets WHERE exp>$1', [now]),
      ]);
      const docs = new Map();
      for (const x of d.rows) { let m = docs.get(x.coll); if (!m) { m = new Map(); docs.set(x.coll, m); } m.set(x.id, x.json); }
      return {
        docs, kv: new Map(k.rows.map(x => [x.k, x.v])), users: new Map(u.rows.map(x => [x.emp, { ...x }])),
        sessions: new Map(s.rows.map(x => [x.token, { token: x.token, emp: x.emp, exp: num(x.exp), seen: num(x.seen) }])),
        resets: new Map(r.rows.map(x => [x.hash, { hash: x.hash, emp: x.emp, exp: num(x.exp) }])), log: [],
      };
    },
    async flush(log) {
      log = compact(log); if (!log.length) return;
      const c = await pool.connect();
      try {
        await c.query('BEGIN');
        for (const [op, ...a] of log) { const [sql, p] = OPS[op](...a); await c.query(sql, p); }
        await c.query('COMMIT');
      } catch (e) { try { await c.query('ROLLBACK'); } catch (_) {} throw e; } finally { c.release(); }
    },
    async fastState(token, rev) {
      await init();
      const r = await pool.query("SELECT v FROM kv WHERE k='rev'");
      if (!r.rows.length || JSON.parse(r.rows[0].v) !== rev) return null;
      const now = Date.now();
      const s = token ? (await pool.query('SELECT emp,exp FROM sessions WHERE token=$1', [token])).rows[0] : null;
      if (!s || num(s.exp) < now) return { code: 401, obj: { error: 'Not signed in' } };
      const e = (await pool.query("SELECT json FROM docs WHERE coll='employees' AND id=$1", [s.emp])).rows[0];
      if (!e || JSON.parse(e.json).status !== 'Active') return { code: 401, obj: { error: 'Not signed in' } };
      await pool.query('UPDATE sessions SET seen=$1 WHERE token=$2', [now, token]);
      const on = await pool.query('SELECT DISTINCT emp FROM sessions WHERE seen>$1 AND exp>$2', [now - 90000, now]);
      return { code: 200, obj: { same: true, rev, online: on.rows.map(x => x.emp) } };
    },
  };
};
