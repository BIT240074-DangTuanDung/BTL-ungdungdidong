const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
process.loadEnvFile(path.resolve('.env'));
const u = new URL(process.env.DATABASE_URL);
if (u.pathname !== '/trohome_db' || !['localhost','127.0.0.1'].includes(u.hostname)) throw Error('Unexpected target');
const env = {...process.env,PGHOST:u.hostname,PGPORT:u.port||'5432',PGDATABASE:'trohome_db',PGUSER:decodeURIComponent(u.username),PGPASSWORD:decodeURIComponent(u.password)};
const folder=path.resolve('backups');
fs.mkdirSync(folder,{recursive:true});
const file=path.join(folder,'before-seed-'+Date.now()+'.dump');
for(const [tool,args] of [['pg_dump',['-Fc','-f',file]],['pg_restore',['--list',file]]]){
 const result=spawnSync('C:/Program Files/PostgreSQL/15/bin/'+tool+'.exe',args,{env,encoding:'utf8'});
 if(result.status!==0){console.error('Backup failed; credentials withheld.');process.exit(1);}
}
console.log('Backup created and archive readable: '+path.basename(file));
