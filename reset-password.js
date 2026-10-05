// Emergency password reset, run on the machine that hosts the server:
//   npm run reset:password -- someone@company.com NewPassword123
// Use this if the only Admin forgot their password.
const fs = require('fs'), path = require('path'), crypto = require('crypto');
const { DatabaseSync } = require('node:sqlite');
const [email, pw] = process.argv.slice(2);
if (!email || !pw) { console.error('Usage: npm run reset:password -- <email> <new-password>'); process.exit(1); }
if (pw.length < 8) { console.error('Password must be at least 8 characters.'); process.exit(1); }
const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
if (!fs.existsSync(path.join(dataDir, 'rmh.db'))) { console.error('No database found in ' + dataDir); process.exit(1); }
const db = new DatabaseSync(path.join(dataDir, 'rmh.db'));
db.exec('PRAGMA busy_timeout=5000');
const row = db.prepare('SELECT emp FROM users WHERE email=?').get(email.trim().toLowerCase());
if (!row) { console.error('No account with that email.'); process.exit(1); }
const salt = crypto.randomBytes(16).toString('hex'), hash = crypto.scryptSync(pw, salt, 64).toString('hex');
db.prepare('UPDATE users SET salt=?,hash=? WHERE emp=?').run(salt, hash, row.emp);
db.prepare('DELETE FROM sessions WHERE emp=?').run(row.emp);
console.log('Password updated for ' + email + '. They can sign in now.');
