// Rabbit Marketing House – Attendance server (zero npm dependencies; needs Node 22.5+)
// Serves the web app + a JSON API backed by SQLite (data/rmh.db). Authentication, permissions and
// attendance timestamps are enforced here, on the server.
const http = require('http'), fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');

const root = __dirname, port = +process.env.PORT || 5173;
// Hosting options (all optional):
//   SETUP_CODE   – if set, the first-run "create Admin" screen asks for this code (stops strangers claiming Admin on a public URL)
//   TRUST_PROXY  – set to 1 behind a reverse proxy (Render, Railway…) so rate limits use the real visitor IP
const SETUP_CODE = process.env.SETUP_CODE || '';
const clientIp = req => (process.env.TRUST_PROXY === '1' && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress;
const dataDir = process.env.DATA_DIR || path.join(root, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const db = new DatabaseSync(path.join(dataDir, 'rmh.db'));
db.exec(`PRAGMA journal_mode=WAL;
CREATE TABLE IF NOT EXISTS docs(coll TEXT NOT NULL,id TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(coll,id));
CREATE TABLE IF NOT EXISTS kv(k TEXT PRIMARY KEY,v TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS users(emp TEXT PRIMARY KEY,email TEXT UNIQUE NOT NULL,salt TEXT NOT NULL,hash TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS resets(hash TEXT PRIMARY KEY,emp TEXT NOT NULL,exp INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,emp TEXT NOT NULL,exp INTEGER NOT NULL,seen INTEGER NOT NULL);`);

/* ---------- storage helpers ---------- */
const COLLS = ['employees', 'departments', 'attendance', 'leaves', 'tasks', 'meetings', 'notifications', 'conversations', 'messages', 'holidays'];
const q = {
  all: db.prepare('SELECT json FROM docs WHERE coll=?'),
  get: db.prepare('SELECT json FROM docs WHERE coll=? AND id=?'),
  put: db.prepare('INSERT INTO docs(coll,id,json) VALUES(?,?,?) ON CONFLICT(coll,id) DO UPDATE SET json=excluded.json'),
  del: db.prepare('DELETE FROM docs WHERE coll=? AND id=?'),
  kvGet: db.prepare('SELECT v FROM kv WHERE k=?'),
  kvSet: db.prepare('INSERT INTO kv(k,v) VALUES(?,?) ON CONFLICT(k) DO UPDATE SET v=excluded.v'),
};
const all = c => q.all.all(c).map(r => JSON.parse(r.json));
const getDoc = (c, id) => { const r = q.get.get(c, String(id)); return r ? JSON.parse(r.json) : null; };
const putDoc = (c, o) => q.put.run(c, String(o.id), JSON.stringify(o));
const delDoc = (c, id) => q.del.run(c, String(id));
const kvGet = k => { const r = q.kvGet.get(k); return r ? JSON.parse(r.v) : null; };
const kvSet = (k, v) => q.kvSet.run(k, JSON.stringify(v));
const rev = () => kvGet('rev') || 0;
const bump = () => kvSet('rev', rev() + 1);

const DEFAULT_SETTINGS = {
  company: { name: 'Rabbit Marketing House', tagline: '', email: '', phone: '', website: '', address: '', reg: '', timezone: 'Asia/Kolkata (IST)', currency: 'INR (₹)' },
  attendance: { start: '09:00', end: '18:00', grace: 10, fullDay: 8, halfDay: 4, breakMin: 60, overtimeAfter: 8, weekend: [0, 6], geo: true, remote: true, lateAlert: true, autoCheckout: false, radius: 150 },
  leave: { Annual: { days: 18, carry: true, max: 5 }, Sick: { days: 10, carry: false, max: 0 }, Casual: { days: 6, carry: false, max: 0 }, Unpaid: { days: 0, carry: false, max: 0 } },
  notify: { leaveRequests: { app: true, email: true }, leaveDecisions: { app: true, email: true }, attendanceReminders: { app: true, email: false }, lateAlerts: { app: true, email: true }, taskAssignments: { app: true, email: true }, taskUpdates: { app: true, email: false }, holidays: { app: true, email: true } },
  security: { twoFA: false, sessionTimeout: 30, passwordExpiry: 90, ipRestrict: false, minPass: 8, allowSignup: true },
};
const DEFAULT_ROLES = {
  Admin: { viewAllAttendance: true, editAttendance: true, approveLeaves: true, assignTasks: true, manageHolidays: true, viewReports: true, manageSettings: true, manageEmployees: true },
  Manager: { viewAllAttendance: true, editAttendance: false, approveLeaves: true, assignTasks: true, manageHolidays: false, viewReports: true, manageSettings: false, manageEmployees: false },
  Employee: { viewAllAttendance: false, editAttendance: false, approveLeaves: false, assignTasks: false, manageHolidays: false, viewReports: false, manageSettings: false, manageEmployees: false },
};
if (!kvGet('settings')) kvSet('settings', DEFAULT_SETTINGS);
if (!kvGet('roles')) kvSet('roles', DEFAULT_ROLES);
// Attendance is only tracked from the day the system went live (editable in Settings → Attendance rules)
{ const st = kvGet('settings'); if (!st.attendance.trackFrom) { const d = new Date(); st.attendance.trackFrom = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); kvSet('settings', st); kvSet('rev', (kvGet('rev') || 0) + 1); } }
if (kvGet('rev') == null) kvSet('rev', 1);

/* ---------- migrations ---------- */
{ const st = kvGet('settings'); if (st.security && st.security.allowSignup === undefined) { st.security.allowSignup = true; kvSet('settings', st); } }
for (const l of all('leaves')) {
  if (l.managerStatus === undefined) {
    const old = l.status;
    Object.assign(l, { managerId: null, days: l.days || 1, managerStatus: '—', adminStatus: old === 'Approved' ? 'Approved' : old === 'Rejected' ? 'Rejected' : 'Pending',
      status: old === 'Pending' ? 'Pending Admin Approval' : old, managerActionDate: null, adminActionDate: null, rejectionReason: l.note || '', rejectedBy: '', finalDate: old === 'Approved' ? l.applied : null });
    putDoc('leaves', l);
  }
}
{ let n = 0; for (const e of all('employees')) { n++; if (!e.code) { e.code = 'RMH-' + String(n).padStart(3, '0'); putDoc('employees', e); } } }

/* ---------- time + auth helpers ---------- */
const pad = n => String(n).padStart(2, '0');
const serverDate = () => { const d = new Date(); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const serverHM = () => { const d = new Date(); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const toMin = t => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
const roles = () => kvGet('roles');
const can = (u, p) => !!(roles()[u.role] || {})[p];
const hashPw = (pw, salt) => crypto.scryptSync(pw, salt, 64).toString('hex');
function setPassword(emp, email, pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  db.prepare('INSERT INTO users(emp,email,salt,hash) VALUES(?,?,?,?) ON CONFLICT(emp) DO UPDATE SET email=excluded.email,salt=excluded.salt,hash=excluded.hash').run(emp, email, salt, hashPw(pw, salt));
  db.prepare('DELETE FROM sessions WHERE emp=?').run(emp); // password changed → sign out everywhere (caller re-creates its own session)
}
const fail = (code, msg) => { const e = new Error(msg); e.code = code; return e; };
const addDaysS = (d, n) => { const x = new Date(d + 'T12:00:00'); x.setDate(x.getDate() + n); return x.getFullYear() + '-' + pad(x.getMonth() + 1) + '-' + pad(x.getDate()); };
function workdaysBetween(from, to) {
  if (!from || !to || to < from || (new Date(to) - new Date(from)) / 864e5 > 180) return [];
  const wk = kvGet('settings').attendance.weekend, hs = new Set(all('holidays').map(h => h.date)), out = [];
  for (let d = from; d <= to; d = addDaysS(d, 1)) { if (!wk.includes(new Date(d + 'T12:00:00').getDay()) && !hs.has(d)) out.push(d); }
  return out;
}
function notifyS(to, type, title, body) { putDoc('notifications', { id: 'n' + crypto.randomBytes(6).toString('hex'), type, title, body, to, read: false, time: new Date().toISOString() }); }
const teamIds = u => all('employees').filter(e => e.manager === u.id).map(e => e.id);
const pick = (o, keys) => { const r = {}; keys.forEach(k => { if (o[k] !== undefined) r[k] = o[k]; }); return r; };
const str = (v, max = 500) => String(v == null ? '' : v).slice(0, max);

const attempts = new Map();
function throttled(key) { const a = (attempts.get(key) || []).filter(t => Date.now() - t < 15 * 60000); attempts.set(key, a); return a.length >= 8; }
const noteFail = key => attempts.set(key, [...(attempts.get(key) || []), Date.now()]);

/* The session token is sent by each browser TAB in the Authorization header (kept in that tab's sessionStorage).
   No cookie is used, so signing in as someone else in another tab can never change this tab's user. */
const bearer = req => { const h = req.headers.authorization || ''; return h.startsWith('Bearer ') ? h.slice(7).trim() : ''; };
function sessionUser(req) {
  const t = bearer(req); if (!t) return null;
  const s = db.prepare('SELECT * FROM sessions WHERE token=?').get(t);
  if (!s || s.exp < Date.now()) return null;
  const u = getDoc('employees', s.emp); if (!u || u.status !== 'Active') return null;
  db.prepare('UPDATE sessions SET seen=? WHERE token=?').run(Date.now(), t);
  return u;
}
function startSession(res, emp) {
  const token = crypto.randomBytes(32).toString('hex'), exp = Date.now() + 30 * 864e5;
  db.prepare('INSERT INTO sessions(token,emp,exp,seen) VALUES(?,?,?,?)').run(token, emp, exp, Date.now());
  res._token = token; // returned to the caller in the JSON body (see send)
}
const onlineIds = () => db.prepare('SELECT DISTINCT emp FROM sessions WHERE seen>? AND exp>?').all(Date.now() - 90000, Date.now()).map(r => r.emp);

/* ---------- state scoped to the requesting user ---------- */
function buildState(u) {
  const on = new Set(onlineIds()), isA = u.role === 'Admin', isM = u.role === 'Manager';
  const allEmps = all('employees');
  const scope = isA ? null : new Set(isM ? [u.id, ...allEmps.filter(e => e.manager === u.id).map(e => e.id)] : [u.id]);
  const inS = id => !scope || scope.has(id);
  const myConvs = all('conversations').filter(c => c.members.includes(u.id));
  const convIds = new Set(myConvs.map(c => c.id));
  return {
    rev: rev(), me: u.id,
    // people outside your scope are visible by name/title only (no contact details)
    employees: allEmps.filter(e => isA || e.status !== 'Pending').map(e => { const r = { ...e, online: on.has(e.id) }; if (!inS(e.id)) { delete r.email; delete r.phone; } return r; }),
    departments: all('departments'), holidays: all('holidays'),
    settings: kvGet('settings'), roles: roles(),
    attendance: all('attendance').filter(r => inS(r.emp)),
    leaves: all('leaves').filter(l => isA || inS(l.emp) || l.managerId === u.id),
    tasks: all('tasks').filter(t => isA || inS(t.assignee) || t.creator === u.id),
    meetings: all('meetings').filter(m => isA || m.all || m.by === u.id || (m.members || []).includes(u.id)),
    notifications: all('notifications').filter(n => n.to === 'all' || n.to === u.id || (n.to === 'admins' && isA)),
    conversations: myConvs,
    messages: all('messages').filter(m => convIds.has(m.conv)),
  };
}

/* ---------- write validation ---------- */
const ROLE_NAMES = ['Admin', 'Manager', 'Employee'];
const validEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
function activeAdmins(excludeId, newState) {
  return all('employees').filter(e => e.status === 'Active' && e.role === 'Admin' && e.id !== excludeId).length + (newState ? 1 : 0);
}
function applyChanges(u, body) {
  const out = { attendance: [], leaves: [] };
  const ch = body.changes || {};
  const A = kvGet('settings').attendance;
  const minPass = kvGet('settings').security.minPass || 8;

  // employees
  const E = ch.employees || {};
  for (const raw of (E.upsert || [])) {
    const o = { ...raw }, pw = o.password; delete o.password;
    if (!o.id) throw fail(400, 'Employee id missing');
    const ex = getDoc('employees', o.id); let rec;
    if (ex) {
      if (can(u, 'manageEmployees')) rec = { ...ex, ...pick(o, ['name', 'title', 'email', 'phone', 'dept', 'role', 'joined', 'status', 'color', 'photo', 'manager']) };
      else if (ex.id === u.id) rec = { ...ex, ...pick(o, ['name', 'title', 'email', 'phone', 'photo']) };
      else throw fail(403, 'Not allowed to edit this employee');
    } else {
      if (!can(u, 'manageEmployees')) throw fail(403, 'Not allowed to add employees');
      if (!pw) throw fail(400, 'A temporary password is required for new employees');
      rec = { ...pick(o, ['id', 'name', 'title', 'email', 'phone', 'dept', 'role', 'joined', 'color', 'photo', 'manager']), status: 'Active', code: 'RMH-' + String(all('employees').length + 1).padStart(3, '0') };
    }
    rec.name = str(rec.name, 80).trim(); rec.email = str(rec.email, 120).trim().toLowerCase();
    rec.title = str(rec.title, 80); rec.phone = str(rec.phone, 30);
    if (rec.photo && !(typeof rec.photo === 'string' && rec.photo.length < 150000 && rec.photo.startsWith('data:image/jpeg;base64,') && /^[A-Za-z0-9+/=]+$/.test(rec.photo.slice(23)))) throw fail(400, 'Invalid photo');
    if (!rec.photo) delete rec.photo;
    if (rec.manager) {
      const mg = getDoc('employees', rec.manager);
      if (!mg || mg.id === rec.id || !['Manager', 'Admin'].includes(mg.role) || mg.status !== 'Active') throw fail(400, 'Choose an active Manager (not the employee themselves) as the reporting manager');
    } else delete rec.manager;
    if (!rec.name) throw fail(400, 'Name is required');
    if (!validEmail(rec.email)) throw fail(400, 'A valid email is required');
    if (!ROLE_NAMES.includes(rec.role)) rec.role = 'Employee';
    if (!['Active', 'Inactive', 'Pending'].includes(rec.status)) rec.status = 'Active';
    if (rec.status === 'Active' && !rec.code) rec.code = 'RMH-' + String(all('employees').length + 1).padStart(3, '0');
    if (ex && ex.status === 'Active' && ex.role === 'Admin' && (rec.role !== 'Admin' || rec.status !== 'Active') && activeAdmins(ex.id) < 1) throw fail(400, 'At least one active Admin is required');
    if (pw) {
      if (!(can(u, 'manageEmployees') || (ex && ex.id === u.id))) throw fail(403, 'Not allowed to set passwords');
      if (String(pw).length < minPass) throw fail(400, `Password must be at least ${minPass} characters`);
    }
    const taken = db.prepare('SELECT emp FROM users WHERE email=? AND emp<>?').get(rec.email, rec.id);
    if (taken) throw fail(400, 'That email is already used by another employee');
    putDoc('employees', rec);
    if (pw) { setPassword(rec.id, rec.email, String(pw)); }
    else if (ex && ex.email !== rec.email) db.prepare('UPDATE users SET email=? WHERE emp=?').run(rec.email, rec.id);
    if (rec.status !== 'Active') db.prepare('DELETE FROM sessions WHERE emp=?').run(rec.id);
  }

  // departments
  const Dp = ch.departments || {};
  if ((Dp.upsert || []).length || (Dp.del || []).length) {
    if (!(can(u, 'manageEmployees') || can(u, 'manageSettings'))) throw fail(403, 'Not allowed to manage departments');
    (Dp.upsert || []).forEach(d => putDoc('departments', { id: d.id, name: str(d.name, 80).trim() || 'Unnamed' }));
    (Dp.del || []).forEach(id => { if (all('employees').some(e => e.dept === id)) throw fail(400, 'Move employees out of the department first'); delDoc('departments', id); });
  }

  // attendance
  const At = ch.attendance || {};
  for (const o of (At.upsert || [])) {
    const ex = getDoc('attendance', o.id);
    if (can(u, 'editAttendance')) { putDoc('attendance', o); continue; }
    if (o.emp !== u.id || o.date !== serverDate()) throw fail(403, 'You can only record your own attendance for today');
    if (ex && ex.emp !== u.id) throw fail(403, 'Not allowed');
    const now = serverHM();
    const rec = ex ? { ...ex } : { id: o.id, emp: u.id, date: o.date, status: 'present', in: null, out: null, breakMin: 0, note: '' };
    rec.mode = ['Office', 'Remote', 'Field'].includes(o.mode) ? o.mode : (rec.mode || 'Office');
    if (!rec.in) {
      if (!o.in) throw fail(400, 'Check-in required');
      rec.in = now; rec.gps = ['Verified', 'Remote', 'Unavailable', 'Off-site'].includes(o.gps) ? o.gps : 'Unavailable';
      rec.coords = o.coords || null; rec.note = str(o.note, 200);
      rec.status = toMin(now) > toMin(A.start) + A.grace ? 'late' : 'present';
      rec.breakMin = 0; delete rec.breakStart;
    } else if (!rec.out) {
      const wasBreak = rec.breakStart;
      if (o.breakStart && !wasBreak) rec.breakStart = now;
      else if (!o.breakStart && wasBreak) { rec.breakMin = (rec.breakMin || 0) + Math.max(0, toMin(now) - toMin(wasBreak)); delete rec.breakStart; }
      if (o.out) {
        if (rec.breakStart) { rec.breakMin = (rec.breakMin || 0) + Math.max(0, toMin(now) - toMin(rec.breakStart)); delete rec.breakStart; }
        rec.out = now;
        const hrs = (toMin(rec.out) - toMin(rec.in) - (rec.breakMin || 0)) / 60;
        if (hrs < A.halfDay && rec.status === 'present') rec.status = 'half';
      }
    }
    putDoc('attendance', rec); out.attendance.push(rec);
  }
  for (const id of (At.del || [])) {
    const ex = getDoc('attendance', id); if (!ex) continue;
    if (can(u, 'editAttendance')) delDoc('attendance', id);
    else throw fail(403, 'Not allowed to delete attendance');
  }

  // leaves — Employee → Manager → Admin approval workflow
  const PEND = ['Pending Manager Approval', 'Pending Admin Approval'];
  const Lv = ch.leaves || {};
  const today = serverDate();
  const applyLeaveToAttendance = l => {
    workdaysBetween(l.from, l.to < today ? l.to : today).filter(d => d <= today).forEach(d => {
      for (const a of all('attendance')) if (a.emp === l.emp && a.date === d) delDoc('attendance', a.id);
      putDoc('attendance', { id: 'lv_' + l.id + '_' + d, emp: l.emp, date: d, status: 'leave', in: null, out: null, breakMin: 0, mode: '—', gps: '—', note: l.type + ' leave' });
    });
  };
  for (const o of (Lv.upsert || [])) {
    const ex = getDoc('leaves', o.id);
    if (!ex) {
      if (o.emp !== u.id) throw fail(403, 'You can only apply for your own leave');
      const LT = kvGet('settings').leave, type = str(o.type, 30);
      if (!LT[type]) throw fail(400, 'Unknown leave type');
      const days = workdaysBetween(o.from, o.to).length;
      if (!days) throw fail(400, 'Choose valid dates that include at least one working day');
      if (!str(o.reason, 500).trim()) throw fail(400, 'Please add a reason');
      if (all('leaves').some(l => l.emp === u.id && !['Rejected', 'Cancelled'].includes(l.status) && l.from <= o.to && o.from <= l.to)) throw fail(400, 'You already have a leave request overlapping these dates');
      if (type !== 'Unpaid') {
        const yr = o.from.slice(0, 4);
        const used = all('leaves').filter(l => l.emp === u.id && l.type === type && l.from.startsWith(yr) && (l.status === 'Approved' || PEND.includes(l.status))).reduce((a, l) => a + l.days, 0);
        if (used + days > LT[type].days) throw fail(400, 'Not enough ' + type + ' leave balance (' + Math.max(0, LT[type].days - used) + ' day(s) available)');
      }
      const mgr = u.manager ? getDoc('employees', u.manager) : null;
      const hasMgr = u.role === 'Employee' && mgr && mgr.status === 'Active' && mgr.role === 'Manager';
      const rec = { id: o.id, emp: u.id, managerId: hasMgr ? mgr.id : null, type, from: o.from, to: o.to, days, reason: str(o.reason, 500).trim(), applied: today,
        status: 'Pending Admin Approval', managerStatus: '—', adminStatus: 'Pending', managerActionDate: null, adminActionDate: null, rejectionReason: '', rejectedBy: '', finalDate: null };
      if (u.role === 'Admin') { Object.assign(rec, { status: 'Approved', adminStatus: 'Approved', adminActionDate: today, finalDate: today }); }
      else if (hasMgr) { Object.assign(rec, { status: 'Pending Manager Approval', managerStatus: 'Pending', adminStatus: '—' }); }
      putDoc('leaves', rec); out.leaves.push(rec);
      const when = o.from === o.to ? o.from : o.from + ' to ' + o.to;
      if (u.role === 'Admin') applyLeaveToAttendance(rec);
      else if (hasMgr) notifyS(mgr.id, 'leave', 'New leave request', u.name + ' applied for ' + type + ' leave (' + when + ', ' + days + ' day' + (days > 1 ? 's' : '') + ').');
      else notifyS('admins', 'leave', 'Leave request awaiting approval', u.name + ' applied for ' + type + ' leave (' + when + ', ' + days + ' day' + (days > 1 ? 's' : '') + ').');
      continue;
    }
    const act = o.action; if (!act) continue;
    const note = str(o.note, 300).trim(), rec = { ...ex };
    const empName = (getDoc('employees', ex.emp) || {}).name || 'Employee';
    if (act === 'cancel') {
      if (ex.emp !== u.id || !PEND.includes(ex.status)) throw fail(403, 'Only your own pending requests can be cancelled');
      rec.status = 'Cancelled'; rec.managerStatus = ex.managerStatus === 'Pending' ? '—' : ex.managerStatus; rec.adminStatus = '—';
      if (ex.managerId && ex.status === 'Pending Manager Approval') notifyS(ex.managerId, 'leave', 'Leave request cancelled', empName + ' cancelled their ' + ex.type + ' leave request.');
    } else if (act === 'manager-approve' || act === 'manager-reject') {
      if (u.role !== 'Manager' || ex.managerId !== u.id || ex.emp === u.id) throw fail(403, 'This request is not assigned to you');
      if (ex.status !== 'Pending Manager Approval') throw fail(400, 'This request is no longer waiting for manager approval');
      rec.managerActionDate = today;
      if (act === 'manager-approve') {
        rec.status = 'Pending Admin Approval'; rec.managerStatus = 'Approved'; rec.adminStatus = 'Pending';
        notifyS(ex.emp, 'leave', 'Leave approved by manager', 'Your ' + ex.type + ' leave was approved by ' + u.name + ' and is now pending Admin approval.');
        notifyS('admins', 'leave', 'Leave request awaiting Admin approval', empName + '\'s ' + ex.type + ' leave (' + ex.from + ' to ' + ex.to + ') was approved by ' + u.name + '.');
      } else {
        if (!note) throw fail(400, 'A rejection reason is required');
        rec.status = 'Rejected'; rec.managerStatus = 'Rejected'; rec.adminStatus = '—'; rec.rejectionReason = note; rec.rejectedBy = u.name;
        notifyS(ex.emp, 'leave', 'Leave rejected', 'Your ' + ex.type + ' leave was rejected by ' + u.name + '. Reason: ' + note);
      }
    } else if (act === 'admin-approve' || act === 'admin-reject') {
      if (u.role !== 'Admin') throw fail(403, 'Only an Admin can give final approval');
      if (ex.emp === u.id) throw fail(403, 'You cannot decide your own request');
      if (!PEND.includes(ex.status)) throw fail(400, 'This request has already been decided');
      rec.adminActionDate = today;
      if (ex.managerStatus === 'Pending') rec.managerStatus = 'Overridden by Admin';
      if (act === 'admin-approve') {
        rec.status = 'Approved'; rec.adminStatus = 'Approved'; rec.finalDate = today;
        notifyS(ex.emp, 'leave', 'Leave approved', 'Your ' + ex.type + ' leave (' + ex.from + ' to ' + ex.to + ') has been approved.');
      } else {
        if (!note) throw fail(400, 'A rejection reason is required');
        rec.status = 'Rejected'; rec.adminStatus = 'Rejected'; rec.rejectionReason = note; rec.rejectedBy = u.name;
        notifyS(ex.emp, 'leave', 'Leave rejected', 'Your ' + ex.type + ' leave was rejected by ' + u.name + '. Reason: ' + note);
      }
    } else throw fail(400, 'Unknown action');
    putDoc('leaves', rec); out.leaves.push(rec);
    if (rec.status === 'Approved') applyLeaveToAttendance(rec);
  }
  for (const id of (Lv.del || [])) {
    const ex = getDoc('leaves', id); if (!ex) continue;
    if (u.role === 'Admin') delDoc('leaves', id); else throw fail(403, 'Cannot delete this request');
  }

  // tasks
  const Tk = ch.tasks || {};
  for (const o of (Tk.upsert || [])) {
    const ex = getDoc('tasks', o.id);
    if (!ex) {
      if (!(can(u, 'assignTasks') || o.assignee === u.id)) throw fail(403, 'Not allowed to assign tasks to others');
      if (u.role === 'Manager' && o.assignee !== u.id && !teamIds(u).includes(o.assignee)) throw fail(403, 'You can only assign tasks to your own team');
      putDoc('tasks', { ...o, creator: u.id, title: str(o.title, 200), desc: str(o.desc, 2000) });
    } else if (can(u, 'assignTasks') || ex.creator === u.id) {
      if (u.role === 'Manager' && o.assignee !== u.id && !teamIds(u).includes(o.assignee)) throw fail(403, 'You can only assign tasks to your own team');
      putDoc('tasks', { ...o, creator: ex.creator });
    }
    else if (ex.assignee === u.id) putDoc('tasks', { ...ex, status: o.status, progress: o.progress, history: o.history });
    else throw fail(403, 'Not allowed to edit this task');
  }
  for (const id of (Tk.del || [])) { const ex = getDoc('tasks', id); if (!ex) continue; if (can(u, 'assignTasks') || ex.creator === u.id) delDoc('tasks', id); else throw fail(403, 'Cannot delete this task'); }

  // meetings
  const Mt = ch.meetings || {};
  for (const o of (Mt.upsert || [])) { const ex = getDoc('meetings', o.id); if (ex && ex.by !== u.id && u.role !== 'Admin') throw fail(403, 'Not your meeting'); putDoc('meetings', { ...o, by: ex ? ex.by : u.id }); }
  for (const id of (Mt.del || [])) { const ex = getDoc('meetings', id); if (ex && (ex.by === u.id || u.role === 'Admin')) delDoc('meetings', id); }

  // holidays
  const Hl = ch.holidays || {};
  if ((Hl.upsert || []).length || (Hl.del || []).length) {
    if (!can(u, 'manageHolidays')) throw fail(403, 'Not allowed to manage holidays');
    (Hl.upsert || []).forEach(h => putDoc('holidays', { id: h.id, name: str(h.name, 120), date: h.date, desc: str(h.desc, 500) }));
    (Hl.del || []).forEach(id => delDoc('holidays', id));
  }

  // notifications (anyone may notify; recipients may only mark read/unread or delete their own)
  const Nt = ch.notifications || {};
  const visible = n => n.to === 'all' || n.to === u.id || (n.to === 'admins' && u.role === 'Admin');
  for (const o of (Nt.upsert || [])) {
    const ex = getDoc('notifications', o.id);
    if (!ex) putDoc('notifications', { id: o.id, type: str(o.type, 20), title: str(o.title, 150), body: str(o.body, 500), to: str(o.to, 40), read: false, time: new Date().toISOString() });
    else if (visible(ex)) putDoc('notifications', { ...ex, read: !!o.read });
  }
  for (const id of (Nt.del || [])) { const ex = getDoc('notifications', id); if (ex && visible(ex)) delDoc('notifications', id); }

  // chat
  for (const c of ((ch.conversations || {}).upsert || [])) {
    if (getDoc('conversations', c.id)) continue;
    if (!(c.members || []).includes(u.id)) throw fail(403, 'You must be a member of the conversation');
    putDoc('conversations', { id: c.id, type: c.type === 'group' ? 'group' : 'dm', name: str(c.name, 80), members: c.members.slice(0, 200) });
  }
  for (const m of ((ch.messages || {}).upsert || [])) {
    if (getDoc('messages', m.id)) continue;
    const c = getDoc('conversations', m.conv);
    if (!c || !c.members.includes(u.id) || m.from !== u.id) throw fail(403, 'Cannot post in this conversation');
    putDoc('messages', { id: m.id, conv: m.conv, from: u.id, text: str(m.text, 2000), ts: new Date().toISOString() });
  }

  // settings & roles
  if (body.settings) {
    if (!can(u, 'manageSettings')) throw fail(403, 'Not allowed to change settings');
    const c = (body.settings.company = body.settings.company || {});
    if (c.logo && !(typeof c.logo === 'string' && c.logo.length < 250000 && c.logo.startsWith('data:image/jpeg;base64,') && /^[A-Za-z0-9+/=]+$/.test(c.logo.slice(23)))) delete c.logo;
    kvSet('settings', body.settings);
  }
  if (body.roles) {
    if (!can(u, 'manageSettings')) throw fail(403, 'Not allowed to change roles');
    const r = body.roles; r.Admin = Object.fromEntries(Object.keys(DEFAULT_ROLES.Admin).map(k => [k, true])); kvSet('roles', r);
  }
  return out;
}

/* ---------- HTTP ---------- */
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };
const send = (res, code, obj) => {
  if (res._token && obj && typeof obj === 'object') obj = { ...obj, sessionToken: res._token }; res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(obj)); };
const readBody = req => new Promise((ok, no) => { let b = ''; req.on('data', c => { b += c; if (b.length > 2e6) { req.destroy(); no(fail(413, 'Too large')); } }); req.on('end', () => { try { ok(b ? JSON.parse(b) : {}); } catch { no(fail(400, 'Bad JSON')); } }); });

async function api(req, res, url) {
  const route = req.method + ' ' + url.pathname;
  try {
    if (route === 'GET /api/me') {
      const users = db.prepare('SELECT COUNT(*) n FROM users').get().n;
      if (!users) return send(res, 200, { needSetup: true, needCode: !!SETUP_CODE });
      const u = sessionUser(req), allowSignup = kvGet('settings').security.allowSignup !== false;
      return send(res, 200, u ? { user: u.id, allowSignup } : { user: null, allowSignup });
    }
    if (route === 'POST /api/setup') {
      if (db.prepare('SELECT COUNT(*) n FROM users').get().n) throw fail(403, 'Already set up');
      const b = await readBody(req), email = str(b.email, 120).trim().toLowerCase(), name = str(b.name, 80).trim();
      if (SETUP_CODE && String(b.code || '') !== SETUP_CODE) throw fail(403, 'Incorrect setup code');
      if (!name || !validEmail(email) || String(b.password || '').length < 8) throw fail(400, 'Enter your name, a valid email and a password of at least 8 characters');
      putDoc('departments', { id: 'd1', name: 'General' });
      const admin = { id: 'e1', name, title: 'Administrator', dept: 'd1', role: 'Admin', joined: serverDate(), email, phone: '', color: '#2b2b30', status: 'Active' };
      putDoc('employees', admin); setPassword('e1', email, String(b.password)); startSession(res, 'e1');
      { const st = kvGet('settings'); st.attendance.trackFrom = serverDate(); kvSet('settings', st); }
      bump();
      return send(res, 200, { user: 'e1' });
    }
    if (route === 'POST /api/login') {
      const b = await readBody(req), email = str(b.email, 120).trim().toLowerCase(), key = clientIp(req) + '|' + email;
      if (throttled(key)) throw fail(429, 'Too many attempts. Try again in 15 minutes.');
      const row = db.prepare('SELECT * FROM users WHERE email=?').get(email);
      const ok = row && crypto.timingSafeEqual(Buffer.from(hashPw(String(b.password || ''), row.salt), 'hex'), Buffer.from(row.hash, 'hex'));
      const emp = ok && getDoc('employees', row.emp);
      if (!ok || !emp) { noteFail(key); throw fail(401, 'Incorrect email or password'); }
      if (emp.status === 'Pending') throw fail(403, 'Your account is waiting for Admin approval. You can sign in once it has been approved.');
      if (emp.status !== 'Active') throw fail(403, 'This account is inactive. Please contact your Admin.');
      startSession(res, emp.id); return send(res, 200, { user: emp.id });
    }
    if (route === 'POST /api/signup') {
      const ip = clientIp(req), key = 'su|' + ip;
      if (throttled(key)) throw fail(429, 'Too many requests. Please try again later.');
      noteFail(key);
      const st = kvGet('settings');
      if (st.security.allowSignup === false) throw fail(403, 'Account requests are turned off. Please ask your Admin to create your account.');
      if (!db.prepare('SELECT COUNT(*) n FROM users').get().n) throw fail(403, 'The system is not set up yet');
      const b = await readBody(req), email = str(b.email, 120).trim().toLowerCase(), name = str(b.name, 80).trim(), pw = String(b.password || '');
      if (!name) throw fail(400, 'Please enter your full name');
      if (!validEmail(email)) throw fail(400, 'Please enter a valid email address');
      if (pw.length < (st.security.minPass || 8)) throw fail(400, 'Password must be at least ' + (st.security.minPass || 8) + ' characters');
      if (db.prepare('SELECT emp FROM users WHERE email=?').get(email)) throw fail(409, 'An account with this email already exists. Try signing in or use "Forgot password".');
      const dept = (all('departments')[0] || {}).id || 'd1';
      const id = 'e' + crypto.randomBytes(5).toString('hex');
      putDoc('employees', { id, name, title: '', dept, role: 'Employee', joined: serverDate(), email, phone: '', color: '#2f6fed', status: 'Pending' });
      setPassword(id, email, pw);
      notifyS('admins', 'account', 'New account request', name + ' (' + email + ') asked for access. Review it in Settings → Employees.');
      bump();
      return send(res, 200, { ok: true });
    }
    if (route === 'POST /api/forgot') {
      const ip = clientIp(req), key = 'fp|' + ip;
      if (throttled(key)) throw fail(429, 'Too many requests. Please try again later.');
      noteFail(key);
      const b = await readBody(req), email = str(b.email, 120).trim().toLowerCase();
      const row = db.prepare('SELECT emp FROM users WHERE email=?').get(email), e = row && getDoc('employees', row.emp);
      if (e && e.status === 'Active') { notifyS('admins', 'account', 'Password reset requested', e.name + ' (' + email + ') forgot their password. Open Settings → Employees → edit → "Generate reset link" and send it to them.'); bump(); }
      return send(res, 200, { ok: true }); // same answer whether or not the email exists
    }
    if (route === 'POST /api/reset') {
      const ip = clientIp(req), key = 'rs|' + ip;
      if (throttled(key)) throw fail(429, 'Too many attempts. Please try again later.');
      const b = await readBody(req), pw = String(b.password || '');
      const h = crypto.createHash('sha256').update(String(b.token || '')).digest('hex');
      const r = db.prepare('SELECT * FROM resets WHERE hash=?').get(h);
      if (!r || r.exp < Date.now()) { noteFail(key); throw fail(400, 'This reset link is invalid or has expired. Ask your Admin for a new one.'); }
      const min = kvGet('settings').security.minPass || 8;
      if (pw.length < min) throw fail(400, 'Password must be at least ' + min + ' characters');
      const row = db.prepare('SELECT email FROM users WHERE emp=?').get(r.emp);
      if (!row) throw fail(400, 'Account not found');
      setPassword(r.emp, row.email, pw);
      db.prepare('DELETE FROM resets WHERE emp=?').run(r.emp);
      return send(res, 200, { ok: true });
    }
    const u = sessionUser(req);
    if (!u) return send(res, 401, { error: 'Not signed in' });
    if (route === 'POST /api/reset-token') {
      if (!can(u, 'manageEmployees')) throw fail(403, 'Not allowed');
      const b = await readBody(req), target = getDoc('employees', b.emp);
      if (!target) throw fail(404, 'Employee not found');
      const token = crypto.randomBytes(24).toString('hex');
      db.prepare('DELETE FROM resets WHERE emp=?').run(target.id);
      db.prepare('INSERT INTO resets(hash,emp,exp) VALUES(?,?,?)').run(crypto.createHash('sha256').update(token).digest('hex'), target.id, Date.now() + 24 * 3600 * 1000);
      return send(res, 200, { token, name: target.name, hours: 24 });
    }
    if (route === 'POST /api/logout') { db.prepare('DELETE FROM sessions WHERE token=?').run(bearer(req)); return send(res, 200, { ok: true }); } // only THIS tab's session ends
    if (route === 'GET /api/state') {
      const since = +url.searchParams.get('rev');
      if (since && since === rev()) return send(res, 200, { same: true, rev: rev(), online: onlineIds() });
      return send(res, 200, buildState(u));
    }
    if (route === 'POST /api/sync') {
      const b = await readBody(req);
      db.exec('BEGIN');
      let out;
      try { out = applyChanges(u, b); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      bump();
      // keep the caller signed in if they changed their own password
      if (!sessionUser(req) || (b.changes && b.changes.employees && (b.changes.employees.upsert || []).some(e => e.id === u.id && e.password))) startSession(res, u.id);
      return send(res, 200, { ok: true, rev: rev(), updated: out });
    }
    if (route === 'POST /api/password') {
      const b = await readBody(req), row = db.prepare('SELECT * FROM users WHERE emp=?').get(u.id), min = kvGet('settings').security.minPass || 8;
      if (!row || !crypto.timingSafeEqual(Buffer.from(hashPw(String(b.current || ''), row.salt), 'hex'), Buffer.from(row.hash, 'hex'))) throw fail(400, 'Current password is incorrect');
      if (String(b.next || '').length < min) throw fail(400, `New password must be at least ${min} characters`);
      setPassword(u.id, row.email, String(b.next)); startSession(res, u.id);
      return send(res, 200, { ok: true });
    }
    return send(res, 404, { error: 'Unknown endpoint' });
  } catch (e) {
    if (!e.code || typeof e.code !== 'number') console.error(e);
    return send(res, typeof e.code === 'number' ? e.code : 500, { error: typeof e.code === 'number' ? e.message : 'Server error' });
  }
}

const PUBLIC = /^\/(index\.html|css\/[\w.-]+\.css|js\/[\w.-]+\.js|assets\/[\w.-]+)$/;
http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (url.pathname.startsWith('/api/')) return api(req, res, url);
  let p = decodeURIComponent(url.pathname); if (p === '/') p = '/index.html';
  if (!PUBLIC.test(p)) { res.writeHead(404); return res.end('Not found'); }
  fs.readFile(path.join(root, p), (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(p)] || 'application/octet-stream', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
    res.end(data);
  });
}).listen(port, '0.0.0.0', () => {
  console.log(`Rabbit Marketing House running at http://localhost:${port}`);
  console.log('Data is stored in data/rmh.db — back this file up regularly.');
});
