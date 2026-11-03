import "dotenv/config";
import { Prisma, PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import { accounts, demoId, expectedIds, favorites, seedData } from "./demo-data";

const db = new PrismaClient();
const credentialPath = path.resolve(__dirname, "../.seed-accounts.local.json");
const credentialsSchema = z.array(z.object({ username: z.string(), password: z.string().min(12).max(72) })).length(accounts.length);

async function main() {
  const target = new URL(process.env.DATABASE_URL ?? "");
  if (process.env.NODE_ENV === "production" || !["localhost", "127.0.0.1"].includes(target.hostname) || target.pathname !== "/trohome_db" || (target.searchParams.get("schema") ?? "public") !== "public") {
    throw new Error("Seed only supports local trohome_db/public outside production.");
  }
  if (!process.argv.includes("--apply")) {
    console.log("Preview only. Use npm run seed to explicitly apply the demo.");
    console.log(JSON.stringify(Object.fromEntries(Object.entries(expectedIds).map(([name, ids]) => [name, ids.length]))));
    return;
  }

  // Hash before taking database locks. Never print generated passwords.
  const credentials = existsSync(credentialPath)
    ? credentialsSchema.parse(JSON.parse(readFileSync(credentialPath, "utf8")))
    : accounts.map(a => ({ username: a.username, password: randomBytes(24).toString("base64url") }));
  if (accounts.some(a => credentials.filter(c => c.username === a.username).length !== 1)) {
    throw new Error("Local credentials do not match demo usernames.");
  }
  const hashes = new Map(await Promise.all(credentials.map(async c => [c.username, await bcrypt.hash(c.password, 12)] as const)));

  const result = await db.$transaction(async tx => {
    // Serialize seed and block competing writes while checking emptiness.
    await tx.$executeRawUnsafe('LOCK TABLE "User", "Property", "Room", "Tenant", "Contract", "Invoice", "Inquiry", "RepairRequest", "Favorite" IN SHARE ROW EXCLUSIVE MODE');
    const groups = {
      user: await tx.user.findMany({select:{id:true}}),
      property: await tx.property.findMany({select:{id:true}}),
      room: await tx.room.findMany({select:{id:true}}),
      tenant: await tx.tenant.findMany({select:{id:true}}),
      contract: await tx.contract.findMany({select:{id:true}}),
      invoice: await tx.invoice.findMany({select:{id:true}}),
      inquiry: await tx.inquiry.findMany({select:{id:true}}),
      repairRequest: await tx.repairRequest.findMany({select:{id:true}}),
      favorite: await tx.favorite.findMany({select:{id:true}}),
    };
    const models = Object.keys(expectedIds) as (keyof typeof expectedIds)[];
    const complete = models.every(model => expectedIds[model].every(id => groups[model].some(row => row.id === id)));
    if (complete) return "Demo already exists: no records or passwords changed.";
    if (models.some(model => groups[model].length > 0)) {
      throw new Error("Database is not empty and demo is incomplete. Nothing was changed.");
    }
    if (!existsSync(credentialPath)) {
      writeFileSync(credentialPath, JSON.stringify(credentials, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    }
    for (const t of seedData.tenants) {
      await tx.tenant.create({data:{...t,id:demoId(t.id)}});
    }
    for (const a of accounts) {
      await tx.user.create({data:{
        id:demoId("user_"+a.key),username:a.username,passwordHash:hashes.get(a.username)!,
        role:a.role,fullName:a.fullName,phone:a.phone,tenantId:a.tenantId,
        isDepositPaid:false,
      }});
    }
    for (const p of seedData.properties) {
      await tx.property.create({data:{...p,id:demoId(p.id),ownerId:demoId("user_host")}});
    }
    for (const r of seedData.rooms) {
      await tx.room.create({data:{...r,id:demoId(r.id),propertyId:demoId(r.propertyId)}});
    }
    for (const c of seedData.contracts) {
      await tx.contract.create({data:{...c,id:demoId(c.id),roomId:demoId(c.roomId),tenantId:demoId(c.tenantId),startDate:new Date(c.startDate),endDate:c.endDate?new Date(c.endDate):null}});
    }
    for (const i of seedData.invoices) {
      const contract=seedData.contracts.find(c=>c.roomId===i.roomId&&c.tenantId===i.tenantId);
      const room=seedData.rooms.find(r=>r.id===i.roomId);
      if(!contract||!room) throw new Error("Demo invoice has no matching contract or room.");
      await tx.invoice.create({data:{
        ...i,id:demoId(i.id),contractId:demoId(contract.id),roomId:demoId(i.roomId),tenantId:demoId(i.tenantId),
        electricityRate:i.electricityRate??room.electricityRate,waterRate:i.waterRate??room.waterRate,
        createdAt:new Date(i.createdAt),paidAt:i.paidAt?new Date(i.paidAt):null,
      }});
    }
    for (const i of seedData.inquiries) {
      await tx.inquiry.create({data:{...i,id:demoId(i.id),roomId:demoId(i.roomId),userId:demoId("user_viewer"),createdAt:new Date(i.createdAt)}});
    }
    for (const r of seedData.repairRequests) {
      await tx.repairRequest.create({data:{...r,id:demoId(r.id),roomId:demoId(r.roomId),tenantId:demoId(r.tenantId),createdAt:new Date(r.createdAt),updatedAt:new Date(r.updatedAt)}});
    }
    await tx.favorite.createMany({data:favorites});
    return "Demo created in one transaction. Credentials saved locally (not printed).";
  }, { isolationLevel:Prisma.TransactionIsolationLevel.Serializable, timeout:30000, maxWait:5000 });
  console.log(result);
}

main().catch((error:unknown)=>{
  // Do not log Prisma arguments, credentials or connection URLs.
  if(error instanceof Prisma.PrismaClientKnownRequestError) console.error("Seed failed; transaction rolled back. Code: "+error.code);
  else console.error("Seed stopped safely. Check database emptiness, target and local credentials; no partial database import.");
  process.exitCode=1;
}).finally(()=>db.$disconnect());
