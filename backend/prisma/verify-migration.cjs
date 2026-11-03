/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
process.loadEnvFile(path.join(__dirname, '..', '.env'));
const u = new URL(process.env.DATABASE_URL);
if (u.pathname !== '/trohome_db' || !['localhost', '127.0.0.1'].includes(u.hostname)) throw new Error('Unexpected target');
const migration = fs.readFileSync(path.join(__dirname, 'migrations/20261103050332_init_trohome/migration.sql'), 'utf8');
if (!migration.startsWith('BEGIN;') || !migration.trimEnd().endsWith('COMMIT;')) throw new Error('Expected transaction wrapper');
const sql = migration.replace(/COMMIT;\s*$/, 'ROLLBACK;');
const result = spawnSync('C:/Program Files/PostgreSQL/15/bin/psql.exe', ['-X', '-v', 'ON_ERROR_STOP=1'], {
 env: { ...process.env, PGHOST: u.hostname, PGPORT: u.port || '5432', PGDATABASE: 'trohome_db', PGUSER: decodeURIComponent(u.username), PGPASSWORD: decodeURIComponent(u.password) },
 input: sql, encoding: 'utf8'
});
if (result.status !== 0) { console.error('Migration rehearsal failed; connection closed and transaction rolled back.'); process.exit(1); }
console.log('Complete migration SQL executed successfully and ROLLED BACK.');
