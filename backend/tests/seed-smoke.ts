import "dotenv/config";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { PrismaClient } from "@prisma/client";
import request from "supertest";
import { createApp } from "../src/app";
import { accounts, demoId, expectedIds } from "../prisma/demo-data";

const db = new PrismaClient();
async function snapshot() {
  // Fingerprints only; no password hashes or data are printed.
  return db.$queryRawUnsafe<{name:string;fingerprint:string}[]>(`
    SELECT 'User' AS name, md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) AS fingerprint FROM "User" t
    UNION ALL SELECT 'Property', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Property" t
    UNION ALL SELECT 'Room', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Room" t
    UNION ALL SELECT 'Tenant', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Tenant" t
    UNION ALL SELECT 'Contract', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Contract" t
    UNION ALL SELECT 'Invoice', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Invoice" t
    UNION ALL SELECT 'Inquiry', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Inquiry" t
    UNION ALL SELECT 'RepairRequest', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "RepairRequest" t
    UNION ALL SELECT 'Favorite', md5(coalesce(string_agg(row_to_json(t)::text, ',' ORDER BY id),'')) FROM "Favorite" t
    ORDER BY name
  `);
}
async function main() {
  const before=await snapshot();
  // Explicit opt-in because this invokes the guarded seed, expected to do no writes.
  if(process.argv.includes("--check-rerun")) {
    assert.equal(await db.user.count({where:{id:{in:expectedIds.user}}}),4);
    assert.equal(await db.room.count({where:{id:{in:expectedIds.room}}}),50);
    const run=spawnSync(process.execPath,["node_modules/tsx/dist/cli.mjs","prisma/seed.ts","--apply"],{encoding:"utf8",env:process.env});
    assert.equal(run.status,0,"Seed rerun failed (output withheld).");
    assert.ok(run.stdout.includes("no records or passwords changed"));
    assert.deepEqual(await snapshot(),before,"Seed rerun must preserve every row.");
    console.log("PASS: second seed preserves all nine tables, including passwords.");
  }
  const credentials=JSON.parse(readFileSync(".seed-accounts.local.json","utf8")) as {username:string;password:string}[];
  const app=createApp(db);
  for(const account of accounts) {
    const credential=credentials.find(c=>c.username===account.username);
    assert.ok(credential);
    const login=await request(app).post("/api/auth/login").send(credential);
    assert.equal(login.status,200);
    const authorization="Bearer "+login.body.data.token;
    const profile=await request(app).get("/api/auth/me").set("Authorization",authorization);
    assert.equal(profile.status,200);
    assert.equal(profile.body.data.role,account.role);
    assert.equal(profile.body.data.passwordHash,undefined);
    const invoices=await request(app).get("/api/invoices").set("Authorization",authorization);
    assert.equal(invoices.status,200);
    const expectedCount=account.key==="host"?3:account.key==="lan"?2:account.key==="minh"?1:0;
    assert.equal(invoices.body.data.length,expectedCount);
    const rooms=await request(app).get("/api/rooms?limit=100").set("Authorization",authorization);
    assert.equal(rooms.status,200);
    assert.equal(rooms.body.data.length,account.role==="host"?50:48);
    if(account.key==="lan") {
      const foreign=await request(app).get("/api/invoices/"+demoId("inv_102_10")).set("Authorization",authorization);
      assert.equal(foreign.status,404);
    }
    assert.equal((await request(app).post("/api/auth/logout").set("Authorization",authorization)).status,204);
    console.log("PASS: login, profile, scoped invoices/rooms, logout for "+account.username);
  }
  assert.deepEqual(await snapshot(),before,"Read-only API smoke check must not change database.");
  console.log("PASS: API verification left all database rows unchanged.");
}
main().catch(()=>{console.error("Seed verification failed; details withheld to protect credentials.");process.exitCode=1;}).finally(()=>db.$disconnect());
