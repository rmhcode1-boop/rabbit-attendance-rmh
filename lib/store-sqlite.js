// SQLite storage (local / single-server use). Uses Node's built-in node:sqlite — no npm packages.
const fs = require('fs'), path = require('path');
const { compact } = require('./compact');

exports.create = function createSqliteStore(dataDir) {
  const { DatabaseSync } = require('node:sqlite');
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'rmh.db'));
  db.exec('PRAGMA busy_timeout=5000');
  db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS docs(coll TEXT NOT NULL,id TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(coll,id));
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(emp TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resets(hash TEXT PRIMARY KEY,emp TEXT NOT NULL,exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,emp TEXT NOT NULL,exp INTEGER NOT NULL,seen INTEGER NOT NULL);`);
  const run = (sql, ...p) => db.prepare(sql).run(...p);
  const OPS = {
    docPut: (c, id, j) => run('INSERT INTO docs(coll,id,json) VALUES(?,?,?) ON CONFLICT(coll,id) DO UPDATE SET json=excluded.json', c, id, j),
    docDel: (c, id) => run('DELETE FROM docs WHERE coll=? AND id=?', c, id),
    kvSet: (k, j) => run('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v', k, j),
    userUpsert: r => run('INSERT INTO users(emp,email,salt,hash) VALUES(?,?,?,?) ON CONFLICT(emp) DO UPDATE SET email=excluded.email,salt=excluded.salt,hash=excluded.hash', r.emp, r.email, r.salt, r.hash),
    userEmail: (emp, email) => run('UPDATE users SET email=? WHERE emp=?', email, emp),
    sessPut: r => run('INSERT INTO sessions(token,emp,exp,seen) VALUES(?,?,?,?) ON CONFLICT(token) DO UPDATE SET seen=excluded.seen', r.token, r.emp, r.exp, r.seen),
    sessTouch: (t, seen) => run('UPDATE sessions SET seen=? WHERE token=?', seen, t),
    sessDelToken: t => run('DELETE FROM sessions WHERE token=?', t),
    sessDelEmp: emp => run('DELETE FROM sessions WHERE emp=?', emp),
    resetPut: r => run('INSERT INTO resets(hash,emp,exp) VALUES(?,?,?) ON CONFLICT(hash) DO UPDATE SET exp=excluded.exp', r.hash, r.emp, r.exp),
    resetDelEmp: emp => run('DELETE FROM resets WHERE emp=?', emp),
  };
  return {
    async load() {
      const docs = new Map();
      for (const r of db.prepare('SELECT coll,id,json FROM docs').all()) { let m = docs.get(r.coll); if (!m) { m = new Map(); docs.set(r.coll, m); } m.set(r.id, r.json); }
      const now = Date.now();
      return {
        docs,
        kv: new Map(db.prepare('SELECT k,v FROM kv').all().map(r => [r.k, r.v])),
        users: new Map(db.prepare('SELECT emp,email,salt,hash FROM users').all().map(r => [r.emp, { ...r }])),
        sessions: new Map(db.prepare('SELECT token,emp,exp,seen FROM sessions WHERE exp>?').all(now).map(r => [r.token, { ...r }])),
        resets: new Map(db.prepare('SELECT hash,emp,exp FROM resets WHERE exp>?').all(now).map(r => [r.hash, { ...r }])),
        log: [],
      };
    },
    async flush(log) {
      log = compact(log); if (!log.length) return;
      db.exec('BEGIN');
      try { for (const [op, ...a] of log) OPS[op](...a); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
    },
    // quick "has anything changed?" check used by the 6-second poll
    async fastState(token, rev) {
      const r = db.prepare("SELECT v FROM kv WHERE k='rev'").get();
      if (!r || JSON.parse(r.v) !== rev) return null;
      const s = token && db.prepare('SELECT emp,exp FROM sessions WHERE token=?').get(token);
      if (!s || s.exp < Date.now()) return { code: 401, obj: { error: 'Not signed in' } };
      const e = db.prepare("SELECT json FROM docs WHERE coll='employees' AND id=?").get(s.emp);
      if (!e || JSON.parse(e.json).status !== 'Active') return { code: 401, obj: { error: 'Not signed in' } };
      db.prepare('UPDATE sessions SET seen=? WHERE token=?').run(Date.now(), token);
      const online = db.prepare('SELECT DISTINCT emp FROM sessions WHERE seen>? AND exp>?').all(Date.now() - 90000, Date.now()).map(x => x.emp);
      return { code: 200, obj: { same: true, rev, online } };
    },
  };
};
