import test from "node:test";
import assert from "node:assert/strict";
import request from "supertest";
import bcrypt from "bcryptjs";
import { Prisma, type PrismaClient } from "@prisma/client";
import { createApp } from "../src/app";
import { Sessions } from "../src/services/sessions";
import { invoiceTotal } from "../src/services/rental";
import * as validators from "../src/validators";

test("room PATCH preserves omitted fields and rejects empty body", () => {
  assert.deepEqual(validators.roomPatch.parse({ price: "200" }), { price: "200" });
  assert.equal(validators.roomPatch.safeParse({}).success, false);
});

const uid = "10000000-0000-4000-8000-000000000001",
  rid = "20000000-0000-4000-8000-000000000001",
  tid = "30000000-0000-4000-8000-000000000001";
type Args = Record<string, unknown>;
type Handler = (args: Args) => unknown;
function fixture(
  role = "host",
  overrides: Record<string, Handler> = {},
  sessions = new Sessions(),
) {
  const calls: { name: string; args: Args }[] = [];
  const actor = { id: uid, role, tenantId: role === "tenant" ? tid : null };
  const tables = [
    "user",
    "tenant",
    "property",
    "room",
    "contract",
    "invoice",
    "inquiry",
    "repairRequest",
    "favorite",
  ];
  const db: Record<string, unknown> = {};
  for (const table of tables) {
    const delegate: Record<string, Handler> = {};
    for (const action of [
      "findUnique",
      "findUniqueOrThrow",
      "findFirst",
      "findMany",
      "create",
      "update",
      "updateMany",
      "delete",
      "deleteMany",
      "upsert",
    ]) {
      const name = table + "." + action;
      delegate[action] = async (args) => {
        calls.push({ name, args });
        if (overrides[name]) return overrides[name](args);
        if (table === "user" && action === "findUnique") return actor;
        if (action === "findMany") return [];
        if (action === "updateMany" || action === "deleteMany")
          return { count: 1 };
        return null;
      };
    }
    db[table] = delegate;
  }
  db.$queryRaw = async () => 1;
  db.$transaction = async (fn: (tx: unknown) => unknown) => fn(db);
  const token = sessions.issue(uid).token;
  const app = createApp(db as unknown as PrismaClient, {
    sessions,
    origins: ["http://localhost:8081"],
  });
  return { app, token, calls, db };
}
const auth = (token: string) => "Bearer " + token;
const room = {
  id: rid,
  propertyId: uid,
  code: "101",
  status: "vacant",
  currentOccupantsCount: 0,
  electricityRate: new Prisma.Decimal(3),
  waterRate: new Prisma.Decimal(2),
};
const contract = {
  id: uid,
  roomId: rid,
  tenantId: tid,
  startDate: new Date("2026-01-01"),
  endDate: new Date("2027-01-01"),
  active: true,
  monthlyRent: new Prisma.Decimal(100),
  room,
};
const invoice = {
  id: uid,
  roomId: rid,
  tenantId: tid,
  status: "unpaid",
  rent: new Prisma.Decimal(100),
  electricityOld: new Prisma.Decimal(0),
  electricityNew: new Prisma.Decimal(2),
  electricityRate: new Prisma.Decimal(3),
  waterOld: new Prisma.Decimal(0),
  waterNew: new Prisma.Decimal(1),
  waterRate: new Prisma.Decimal(2),
  other: new Prisma.Decimal(5),
};
test("health queries database", async () => {
  const f = fixture();
  const r = await request(f.app).get("/api/health");
  assert.equal(r.status, 200);
  assert.equal(r.body.data.database, "connected");
});
test("health database failure is 503 without details", async () => {
  const f = fixture();
  f.db.$queryRaw = async () => {
    throw Error("secret");
  };
  const r = await request(f.app).get("/api/health");
  assert.equal(r.status, 503);
  assert.ok(!r.text.includes("secret"));
});
test("invalid token rejected", async () => {
  const f = fixture();
  assert.equal(
    (
      await request(f.app)
        .get("/api/rooms")
        .set("Authorization", "Bearer invalid")
    ).status,
    401,
  );
});
test("expired token rejected", async () => {
  let now = 0;
  const sessions = new Sessions(1000, () => now);
  const f = fixture("host", {}, sessions);
  now = 1001;
  assert.equal(
    (await request(f.app).get("/api/rooms").set("Authorization", auth(f.token)))
      .status,
    401,
  );
});
test("logout revokes token", async () => {
  const f = fixture();
  assert.equal(
    (
      await request(f.app)
        .post("/api/auth/logout")
        .set("Authorization", auth(f.token))
    ).status,
    204,
  );
  assert.equal(
    (await request(f.app).get("/api/rooms").set("Authorization", auth(f.token)))
      .status,
    401,
  );
});
test("registration hashes password and fixes role", async () => {
  let hash = "";
  const f = fixture("tenant", {
    "tenant.create": () => ({ id: tid }),
    "user.create": (args) => {
      const data = args.data as Record<string, string>;
      hash = data.passwordHash;
      assert.equal(data.role, "tenant");
      return { id: uid, role: "tenant" };
    },
  });
  const r = await request(f.app)
    .post("/api/auth/register")
    .send({
      username: " Alice ",
      password: "strong-password-123",
      fullName: "Alice",
      phone: "0901234567",
    });
  assert.equal(r.status, 201);
  assert.ok(await bcrypt.compare("strong-password-123", hash));
  assert.ok(!r.text.includes("password"));
});
test("registration rejects supplied host role", async () => {
  const f = fixture();
  const r = await request(f.app)
    .post("/api/auth/register")
    .send({
      username: "alice",
      password: "strong-password-123",
      fullName: "Alice",
      phone: "0901234567",
      role: "host",
    });
  assert.equal(r.status, 400);
  assert.equal(f.calls.length, 0);
});
test("login succeeds without exposing hash", async () => {
  const passwordHash = await bcrypt.hash("strong-password-123", 4);
  const f = fixture("tenant", {
    "user.findUnique": () => ({ id: uid, passwordHash }),
  });
  const r = await request(f.app)
    .post("/api/auth/login")
    .send({ username: "alice", password: "strong-password-123" });
  assert.equal(r.status, 200);
  assert.equal(r.body.data.token.length, 43);
  assert.ok(!r.text.includes(passwordHash));
});
test("wrong password rejected", async () => {
  const passwordHash = await bcrypt.hash("strong-password-123", 4);
  const f = fixture("tenant", {
    "user.findUnique": () => ({ id: uid, passwordHash }),
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/auth/login")
        .send({ username: "alice", password: "wrong-password-123" })
    ).status,
    401,
  );
});
test("authentication endpoints rate limited", async () => {
  const f = fixture();
  let status = 0;
  for (let i = 0; i < 21; i++)
    status = (await request(f.app).post("/api/auth/login").send({})).status;
  assert.equal(status, 429);
});
test("tenant cannot create property or mark paid", async () => {
  const f = fixture("tenant");
  for (const path of ["/api/properties", "/api/invoices/" + uid + "/pay"])
    assert.equal(
      (
        await request(f.app)
          .post(path)
          .set("Authorization", auth(f.token))
          .send({})
      ).status,
      403,
    );
});
test("property creation owner is server assigned", async () => {
  const f = fixture("host", { "property.create": (args) => args.data });
  const r = await request(f.app)
    .post("/api/properties")
    .set("Authorization", auth(f.token))
    .send({ name: "TroHome", address: "Ha Noi" });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.ownerId, uid);
});
test("property patch has ownership filter", async () => {
  const f = fixture("host", {
    "property.updateMany": (args) => {
      assert.deepEqual(args.where, { id: rid, ownerId: uid });
      return { count: 0 };
    },
  });
  assert.equal(
    (
      await request(f.app)
        .patch("/api/properties/" + rid)
        .set("Authorization", auth(f.token))
        .send({ name: "Other" })
    ).status,
    404,
  );
});
test("room creation checks property ownership", async () => {
  const f = fixture("host", {
    "property.findFirst": (args) => {
      assert.deepEqual(args.where, { id: uid, ownerId: uid });
      return null;
    },
  });
  const r = await request(f.app)
    .post("/api/rooms")
    .set("Authorization", auth(f.token))
    .send({
      propertyId: uid,
      code: "1",
      floor: 1,
      area: "20",
      price: "100",
      deposit: "100",
      electricityRate: "3",
      waterRate: "2",
    });
  assert.equal(r.status, 404);
  assert.ok(!f.calls.some((c) => c.name === "room.create"));
});
test("room patch cannot mass assign owner or occupancy", async () => {
  const f = fixture();
  assert.equal(
    (
      await request(f.app)
        .patch("/api/rooms/" + rid)
        .set("Authorization", auth(f.token))
        .send({ currentOccupantsCount: 9 })
    ).status,
    400,
  );
});
test("room valid patch and safe deletion", async () => {
  const f = fixture("host", {
    "room.findFirst": () => room,
    "room.update": (args) => ({ ...room, ...(args.data as object) }),
    "room.delete": () => room,
  });
  assert.equal(
    (
      await request(f.app)
        .patch("/api/rooms/" + rid)
        .set("Authorization", auth(f.token))
        .send({ price: "200" })
    ).status,
    200,
  );
  assert.equal(
    (
      await request(f.app)
        .delete("/api/rooms/" + rid)
        .set("Authorization", auth(f.token))
    ).status,
    204,
  );
});
test("invalid query and UUID rejected", async () => {
  const f = fixture();
  for (const path of [
    "/api/rooms?limit=500",
    "/api/rooms/not-uuid",
    "/api/rooms?ownerId=x",
  ])
    assert.equal(
      (await request(f.app).get(path).set("Authorization", auth(f.token)))
        .status,
      400,
    );
});
test("tenant invoices scoped to own tenant ID", async () => {
  const f = fixture("tenant", {
    "invoice.findMany": (args) => {
      assert.equal((args.where as Record<string, string>).tenantId, tid);
      return [];
    },
  });
  assert.equal(
    (
      await request(f.app)
        .get("/api/invoices")
        .set("Authorization", auth(f.token))
    ).status,
    200,
  );
});
test("foreign invoice detail unavailable", async () => {
  const f = fixture("tenant", {
    "invoice.findFirst": (args) => {
      assert.equal((args.where as Record<string, string>).tenantId, tid);
      return null;
    },
  });
  assert.equal(
    (
      await request(f.app)
        .get("/api/invoices/" + uid)
        .set("Authorization", auth(f.token))
    ).status,
    404,
  );
});
test("inquiry uses authenticated identity", async () => {
  const f = fixture("tenant", {
    "room.findFirst": () => room,
    "user.findUniqueOrThrow": () => ({
      fullName: "Alice",
      phone: "0901234567",
    }),
    "inquiry.create": (args) => args.data,
  });
  const r = await request(f.app)
    .post("/api/inquiries")
    .set("Authorization", auth(f.token))
    .send({ roomId: rid, message: "Hello" });
  assert.equal(r.status, 201);
  assert.equal(r.body.data.userId, uid);
});
test("inquiry acceptance reserves room and rejects competitors", async () => {
  const item = { id: uid, roomId: rid, status: "new" };
  const f = fixture("host", {
    "inquiry.findFirst": () => item,
    "inquiry.findUniqueOrThrow": () => item,
    "room.findFirst": () => room,
    "inquiry.update": () => ({ ...item, status: "accepted" }),
  });
  assert.equal(
    (
      await request(f.app)
        .patch("/api/inquiries/" + uid + "/status")
        .set("Authorization", auth(f.token))
        .send({ status: "accepted" })
    ).status,
    200,
  );
  assert.ok(f.calls.some((c) => c.name === "room.update"));
  assert.ok(f.calls.some((c) => c.name === "inquiry.updateMany"));
});
test("tenant cannot accept inquiry", async () => {
  const f = fixture("tenant", {
    "inquiry.findFirst": () => ({ id: uid, roomId: rid, status: "new" }),
  });
  assert.equal(
    (
      await request(f.app)
        .patch("/api/inquiries/" + uid + "/status")
        .set("Authorization", auth(f.token))
        .send({ status: "accepted" })
    ).status,
    403,
  );
});
test("contract creation occupies room in transaction", async () => {
  const f = fixture("host", {
    "room.findFirst": () => room,
    "tenant.findFirst": () => ({ id: tid }),
    "contract.create": () => contract,
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/contracts")
        .set("Authorization", auth(f.token))
        .send({
          roomId: rid,
          tenantId: tid,
          startDate: "2026-01-01",
          monthlyRent: "100",
          deposit: "100",
        })
    ).status,
    201,
  );
  assert.ok(f.calls.some((c) => c.name === "room.update"));
});
test("occupied room rejects new contract", async () => {
  const f = fixture("host", {
    "room.findFirst": () => ({ ...room, status: "occupied" }),
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/contracts")
        .set("Authorization", auth(f.token))
        .send({
          roomId: rid,
          tenantId: tid,
          startDate: "2026-01-01",
          monthlyRent: "100",
          deposit: "100",
        })
    ).status,
    409,
  );
});
test("contract cannot use unrelated tenant", async () => {
  const f = fixture("host", { "room.findFirst": () => room });
  assert.equal(
    (
      await request(f.app)
        .post("/api/contracts")
        .set("Authorization", auth(f.token))
        .send({
          roomId: rid,
          tenantId: tid,
          startDate: "2026-01-01",
          monthlyRent: "100",
          deposit: "100",
        })
    ).status,
    404,
  );
});
test("end contract releases room", async () => {
  const f = fixture("host", {
    "contract.findFirst": () => contract,
    "contract.findUniqueOrThrow": () => ({ ...contract, active: false }),
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/contracts/" + uid + "/end")
        .set("Authorization", auth(f.token))
        .send({ endDate: "2026-11-01" })
    ).status,
    200,
  );
  assert.ok(f.calls.some((c) => c.name === "room.update"));
});
const bill = {
  contractId: uid,
  period: "2026-02",
  electricityOld: "0",
  electricityNew: "2",
  waterOld: "0",
  waterNew: "1",
};
test("invoice creation snapshots rates and rent", async () => {
  const f = fixture("host", {
    "contract.findFirst": () => contract,
    "invoice.create": (args) => {
      const d = args.data as Record<string, unknown>;
      assert.equal(d.rent, contract.monthlyRent);
      assert.equal(d.tenantId, tid);
      return invoice;
    },
  });
  const r = await request(f.app)
    .post("/api/invoices")
    .set("Authorization", auth(f.token))
    .send(bill);
  assert.equal(r.status, 201);
  assert.equal(r.body.data.total, "113.00");
});
test("duplicate invoice mapped to conflict", async () => {
  const f = fixture("host", {
    "contract.findFirst": () => contract,
    "invoice.create": () => {
      throw new Prisma.PrismaClientKnownRequestError("duplicate", {
        code: "P2002",
        clientVersion: "6.19.3",
      });
    },
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/invoices")
        .set("Authorization", auth(f.token))
        .send(bill)
    ).status,
    409,
  );
});
test("out of contract period rejected", async () => {
  const f = fixture("host", { "contract.findFirst": () => contract });
  assert.equal(
    (
      await request(f.app)
        .post("/api/invoices")
        .set("Authorization", auth(f.token))
        .send({ ...bill, period: "2025-12" })
    ).status,
    409,
  );
});
test("payment set by host, no client paidAt", async () => {
  const f = fixture("host", {
    "invoice.findFirst": () => invoice,
    "invoice.findUniqueOrThrow": () => ({
      ...invoice,
      status: "paid",
      paidAt: new Date(),
    }),
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/invoices/" + uid + "/pay")
        .set("Authorization", auth(f.token))
        .send({})
    ).status,
    200,
  );
  const call = f.calls.find((c) => c.name === "invoice.updateMany")!;
  assert.ok((call.args.data as Record<string, unknown>).paidAt instanceof Date);
});
test("repair requires current tenant contract", async () => {
  const f = fixture("tenant");
  assert.equal(
    (
      await request(f.app)
        .post("/api/repairs")
        .set("Authorization", auth(f.token))
        .send({ roomId: rid, description: "Broken tap" })
    ).status,
    404,
  );
});
test("favorites removal always scoped", async () => {
  const f = fixture("tenant");
  assert.equal(
    (
      await request(f.app)
        .delete("/api/favorites/" + rid)
        .set("Authorization", auth(f.token))
    ).status,
    204,
  );
  assert.deepEqual(
    f.calls.find((c) => c.name === "favorite.deleteMany")!.args.where,
    { roomId: rid, userId: uid },
  );
});
test("CORS rejects unknown browser origin", async () => {
  const f = fixture();
  assert.equal(
    (
      await request(f.app)
        .get("/api/health")
        .set("Origin", "https://evil.example")
    ).status,
    403,
  );
});
test("server error hides exception detail", async () => {
  const f = fixture("host", {
    "property.findMany": () => {
      throw Error("secret database password");
    },
  });
  const r = await request(f.app)
    .get("/api/properties")
    .set("Authorization", auth(f.token));
  assert.equal(r.status, 500);
  assert.ok(!r.text.includes("secret"));
});
test("decimal arithmetic and validation", () => {
  assert.equal(invoiceTotal(invoice), "113.00");
  assert.equal(validators.money.safeParse("-1").success, false);
  assert.equal(validators.date.safeParse("2026-02-30").success, false);
  assert.equal(
    validators.invoiceBody.safeParse({ ...bill, electricityOld: "3" }).success,
    false,
  );
});
test("password change revokes all sessions and rejects old credential sessions", async () => {
  let passwordHash = await bcrypt.hash("strong-password-123", 4);
  const user = () => ({ id: uid, role: "tenant", tenantId: tid, passwordHash });
  const f = fixture("tenant", {
    "user.findUnique": user,
    "user.findUniqueOrThrow": user,
    "user.updateMany": (args) => {
      passwordHash = (args.data as Record<string, string>).passwordHash;
      return { count: 1 };
    },
  });
  const login = await request(f.app)
    .post("/api/auth/login")
    .send({ username: "alice", password: "strong-password-123" });
  const token = login.body.data.token;
  assert.equal(
    (
      await request(f.app)
        .post("/api/auth/change-password")
        .set("Authorization", auth(token))
        .send({
          currentPassword: "strong-password-123",
          newPassword: "new-password-456",
        })
    ).status,
    204,
  );
  assert.ok(await bcrypt.compare("new-password-456", passwordHash));
  assert.equal(
    (await request(f.app).get("/api/auth/me").set("Authorization", auth(token)))
      .status,
    401,
  );
});
test("profile update synchronizes linked tenant", async () => {
  const f = fixture("tenant", {
    "user.update": (args) => ({
      id: uid,
      tenantId: tid,
      ...(args.data as object),
    }),
  });
  assert.equal(
    (
      await request(f.app)
        .patch("/api/auth/me")
        .set("Authorization", auth(f.token))
        .send({ fullName: "New name" })
    ).status,
    200,
  );
  assert.ok(f.calls.some((c) => c.name === "tenant.update"));
});
test("reserved room cannot be allocated to unrelated previous tenant", async () => {
  const f = fixture("host", {
    "room.findFirst": () => ({ ...room, status: "reserved" }),
    "tenant.findFirst": () => ({ id: tid }),
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/contracts")
        .set("Authorization", auth(f.token))
        .send({
          roomId: rid,
          tenantId: tid,
          startDate: "2026-01-01",
          monthlyRent: "100",
          deposit: "100",
        })
    ).status,
    409,
  );
});
test("paid invoice cannot be reopened", async () => {
  const f = fixture("host", {
    "invoice.updateMany": (args) => {
      assert.deepEqual((args.where as Record<string, unknown>).status, {
        not: "paid",
      });
      return { count: 0 };
    },
  });
  assert.equal(
    (
      await request(f.app)
        .patch("/api/invoices/" + uid + "/status")
        .set("Authorization", auth(f.token))
        .send({ status: "unpaid" })
    ).status,
    409,
  );
});
test("valid repair creation and completion permissions", async () => {
  const f = fixture("tenant", {
    "contract.findFirst": () => contract,
    "repairRequest.create": (args) => args.data,
  });
  assert.equal(
    (
      await request(f.app)
        .post("/api/repairs")
        .set("Authorization", auth(f.token))
        .send({ roomId: rid, description: "Leaking tap" })
    ).status,
    201,
  );
  assert.equal(
    (
      await request(f.app)
        .patch("/api/repairs/" + uid + "/status")
        .set("Authorization", auth(f.token))
        .send({ status: "completed" })
    ).status,
    403,
  );
});
