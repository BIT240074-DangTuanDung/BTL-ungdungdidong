/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
process.loadEnvFile(path.join(__dirname, '..', '.env'));
const u = new URL(process.env.DATABASE_URL);
if (u.pathname !== '/trohome_db' || !['localhost', '127.0.0.1'].includes(u.hostname)) throw new Error('Unexpected database target');
const env = { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGDATABASE: 'trohome_db', PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password) };
function run(name, args) {
  const r = spawnSync('C:/Program Files/PostgreSQL/15/bin/' + name + '.exe', args, { env, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(name + ' failed (credentials withheld)');
  return r.stdout.trim();
}
const tables = run('psql', ['-X', '-At', '-c', "SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename <> '_prisma_migrations'"]);
if (tables) throw new Error('Application tables already exist; stop for review');
const folder = path.join(__dirname, '..', 'backups');
fs.mkdirSync(folder, { recursive: true });
const file = path.join(folder, 'before-init-' + Date.now() + '.dump');
run('pg_dump', ['-Fc', '-f', file]);
run('pg_restore', ['--list', file]);
console.log('Preflight passed: no public application tables. Backup created and archive readable: ' + path.basename(file));
