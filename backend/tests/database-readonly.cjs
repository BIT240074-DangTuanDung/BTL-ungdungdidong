const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
 const result = await db.$transaction(async tx => {
  await tx.$executeRawUnsafe('SET TRANSACTION READ ONLY');
  const version = await tx.$queryRawUnsafe("SELECT current_database() AS name, current_setting('server_version') AS version");
  const counts = {};
  for (const model of ['user','property','room','tenant','contract','invoice','inquiry','repairRequest','favorite']) counts[model]=await tx[model].count();
  const constraints=await tx.$queryRawUnsafe("SELECT conname FROM pg_constraint WHERE connamespace='public'::regnamespace AND contype='c'");
  const indexes=await tx.$queryRawUnsafe("SELECT indexname FROM pg_indexes WHERE schemaname='public' AND indexname IN ('Contract_one_active_room','Contract_one_active_tenant','Inquiry_one_open_request')");
  if(constraints.length<4||indexes.length!==3) throw Error('Missing custom constraints');
  return {database:version,counts,customChecks:constraints.length,partialUniqueIndexes:indexes.length};
 });
 console.log(JSON.stringify(result));
}
main().catch(()=>{console.error('Read-only database verification failed.');process.exitCode=1;}).finally(()=>db.$disconnect());
