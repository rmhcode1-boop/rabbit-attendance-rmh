// Creates (or removes) the three DEMO accounts used for testing the role-based flow.
//   npm run seed:demo            -> add demo Admin / Manager / Employee
//   npm run seed:demo -- --remove -> delete them again
// WARNING: these passwords are public. Remove the accounts before real staff use the system.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(path.join(dataDir, 'rmh.db'))) { console.error('No database yet. Start the server once (npm run dev) and create the first Admin, then run this again.'); process.exit(1); }
const db = new DatabaseSync(path.join(dataDir, 'rmh.db'));
db.exec('PRAGMA busy_timeout=5000');
const put = (c, o) => db.prepare('INSERT INTO docs(coll,id,json) VALUES(?,?,?) ON CONFLICT(coll,id) DO UPDATE SET json=excluded.json').run(c, o.id, JSON.stringify(o));
const del = (c, id) => db.prepare('DELETE FROM docs WHERE coll=? AND id=?').run(c, id);
const all = c => db.prepare('SELECT json FROM docs WHERE coll=?').all(c).map(r => JSON.parse(r.json));
const bump = () => { const r = db.prepare("SELECT v FROM kv WHERE k='rev'").get(); db.prepare("INSERT INTO kv(k,v) VALUES('rev',?) ON CONFLICT(k) DO UPDATE SET v=excluded.v").run(JSON.stringify((r ? JSON.parse(r.v) : 0) + 1)); };
const d = new Date(), today = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');

const DEMO = [
  { id: 'demo_admin', code: 'ADM001', name: 'Rabbit Admin', title: 'Administrator', role: 'Admin', email: 'admin@rabbitmarketinghouse.com', pw: 'Admin@123', color: '#2b2b30' },
  { id: 'demo_manager', code: 'MGR001', name: 'John Manager', title: 'Marketing Manager', role: 'Manager', email: 'manager@rabbitmarketinghouse.com', pw: 'Manager@123', color: '#2f6fed' },
  { id: 'demo_employee', code: 'EMP001', name: 'Ashik', title: 'Marketing Executive', role: 'Employee', email: 'employee@rabbitmarketinghouse.com', pw: 'Employee@123', color: '#1f9d55', manager: 'demo_manager' },
];

if (process.argv.includes('--remove')) {
  for (const u of DEMO) {
    del('employees', u.id); db.prepare('DELETE FROM users WHERE emp=?').run(u.id); db.prepare('DELETE FROM sessions WHERE emp=?').run(u.id);
    for (const l of all('leaves')) if (l.emp === u.id) del('leaves', l.id);
    for (const a of all('attendance')) if (a.emp === u.id) del('attendance', a.id);
    for (const t of all('tasks')) if (t.assignee === u.id || t.creator === u.id) del('tasks', t.id);
  }
  bump(); console.log('Demo accounts removed.'); process.exit(0);
}

let dept = (all('departments')[0] || {}).id;
if (!dept) { dept = 'd1'; put('departments', { id: 'd1', name: 'General' }); }
let n = all('employees').length;
for (const u of DEMO) {
  const email = u.email, clash = db.prepare('SELECT emp FROM users WHERE email=?').get(email);
  if (clash && clash.emp !== u.id) { console.log('Skipped ' + email + ' (email already used by another account)'); continue; }
  const rec = { id: u.id, name: u.name, title: u.title, dept, role: u.role, joined: today, email, phone: '', color: u.color, status: 'Active', code: u.code };
  if (u.manager) rec.manager = u.manager;
  put('employees', rec);
  const salt = crypto.randomBytes(16).toString('hex'), hash = crypto.scryptSync(u.pw, salt, 64).toString('hex');
  db.prepare('INSERT INTO users(emp,email,salt,hash) VALUES(?,?,?,?) ON CONFLICT(emp) DO UPDATE SET email=excluded.email,salt=excluded.salt,hash=excluded.hash').run(u.id, email, salt, hash);
  console.log('Created ' + u.role.padEnd(8) + email + '  /  ' + u.pw);
}
bump();
console.log('\nDemo accounts are ready. They use public passwords — run "npm run seed:demo -- --remove" before real use.');
