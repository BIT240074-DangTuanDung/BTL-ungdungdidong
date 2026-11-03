const { PrismaClient } = require('@prisma/client');
const { randomUUID } = require('node:crypto');
const db = new PrismaClient();
const rollback = new Error('ROLLBACK_TEST_DATA');
let passed = 0;
async function main() {
 await db.$transaction(async tx => {
  async function rejects(label, fn, expected) {
   await tx.$executeRawUnsafe('SAVEPOINT integrity_case');
   let error;
   try { await fn(); } catch (e) { error = e; }
   await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT integrity_case');
   if (!error || (expected && error.code !== expected)) throw new Error('FAILED: ' + label);
   passed++; console.log('PASS: ' + label);
  }
  const user = await tx.user.create({data:{username:randomUUID(),passwordHash:'test-only',role:'host',fullName:'Test',phone:''}});
  const property = await tx.property.create({data:{ownerId:user.id,name:'Test',address:'Test'}});
  const room = await tx.room.create({data:{propertyId:property.id,code:'T',floor:1,area:20,price:100,deposit:100,electricityRate:3,waterRate:2}});
  const tenant = await tx.tenant.create({data:{fullName:'Test',phone:''}});
  const tenant2 = await tx.tenant.create({data:{fullName:'Test2',phone:''}});
  const contractData = {roomId:room.id,tenantId:tenant.id,startDate:new Date('2026-01-01'),monthlyRent:100,deposit:100};
  const contract = await tx.contract.create({data:contractData});
  await rejects('duplicate active room',()=>tx.contract.create({data:{...contractData,tenantId:tenant2.id}}),'P2002');
  const room2 = await tx.room.create({data:{propertyId:property.id,code:'T2',floor:1,area:20,price:100,deposit:100,electricityRate:3,waterRate:2}});
  await rejects('duplicate active tenant',()=>tx.contract.create({data:{...contractData,roomId:room2.id}}),'P2002');
  await tx.contract.create({data:{...contractData,active:false}});
  const invoiceData = {contractId:contract.id,roomId:room.id,tenantId:tenant.id,period:'2026-01',rent:100,electricityRate:3,waterRate:2,electricityOld:0,electricityNew:1,waterOld:0,waterNew:1};
  await tx.invoice.create({data:invoiceData});
  await rejects('duplicate invoice period',()=>tx.invoice.create({data:invoiceData}),'P2002');
  await rejects('invoice mismatched tenant',()=>tx.invoice.create({data:{...invoiceData,period:'2026-02',tenantId:tenant2.id}}),'P2003');
  await rejects('decreasing meter',()=>tx.invoice.create({data:{...invoiceData,period:'2026-02',electricityNew:-1}}));
  await rejects('negative money',()=>tx.invoice.create({data:{...invoiceData,period:'2026-02',rent:-1}}));
  await rejects('paid without timestamp',()=>tx.invoice.create({data:{...invoiceData,period:'2026-02',status:'paid'}}));
  await rejects('invalid period',()=>tx.invoice.create({data:{...invoiceData,period:'2026-13'}}));
  await rejects('missing foreign key',()=>tx.property.create({data:{ownerId:randomUUID(),name:'X',address:'X'}}),'P2003');
  await rejects('delete room with history',()=>tx.room.delete({where:{id:room.id}}),'P2003');
  const inquiryData={userId:user.id,roomId:room.id,name:'Test',phone:''};
  await tx.inquiry.create({data:inquiryData});
  await rejects('duplicate open inquiry',()=>tx.inquiry.create({data:inquiryData}),'P2002');
  await tx.invoice.create({data:{...invoiceData,period:'2026-02',status:'paid',paidAt:new Date()}});
  console.log('Valid history and paid invoice accepted.');
  throw rollback;
 }, { timeout: 30000 }).catch(e=>{if(e!==rollback) throw e;});
 console.log(passed + ' rejection checks passed; ALL test data rolled back.');
 const counts = await Promise.all(['user','property','room','tenant','contract','invoice','inquiry','repairRequest','favorite'].map(async name=>[name,await db[name].count()]));
 console.log(JSON.stringify(Object.fromEntries(counts)));
}
main().catch(()=>{console.error('Integrity verification failed; transaction rolled back.');process.exitCode=1;}).finally(()=>db.$disconnect());
