import { Router } from "express";
import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import { hostOnly } from "../middlewares/auth";
import { check } from "../utils/errors";
import * as v from "../validators";
import {
  lockRoom,
  ownedRoom,
  privateScope,
  roomScope,
} from "../services/access";
import {
  createContract,
  endContract,
  createInvoice,
  invoiceTotal,
  transactionOptions,
} from "../services/rental";
export function resourceRoutes(db: PrismaClient) {
  const r = Router();
  r.get("/properties", async (req, res) => {
    const q = v.pageQuery.parse(req.query),
      a = res.locals.actor;
    const where: Prisma.PropertyWhereInput =
      a.role === "host"
        ? { ownerId: a.id }
        : { rooms: { some: { listed: true, status: "vacant" } } };
    res.json({
      data: await db.property.findMany({
        where,
        ...v.paging(q),
        orderBy: { id: "asc" },
        select: { id: true, name: true, address: true },
      }),
    });
  });
  r.post("/properties", hostOnly, async (req, res) => {
    res
      .status(201)
      .json({
        data: await db.property.create({
          data: {
            ...v.propertyBody.parse(req.body),
            ownerId: res.locals.actor.id,
          },
        }),
      });
  });
  r.get("/properties/:id", async (req, res) => {
    const id = v.id.parse(req.params.id),
      a = res.locals.actor;
    const data = await db.property.findFirst({
      where: {
        id,
        ...(a.role === "host"
          ? { ownerId: a.id }
          : { rooms: { some: { listed: true, status: "vacant" } } }),
      },
      select: { id: true, name: true, address: true },
    });
    check(data, 404, "NOT_FOUND", "Property not found.");
    res.json({ data });
  });
  r.patch("/properties/:id", hostOnly, async (req, res) => {
    const id = v.id.parse(req.params.id),
      input = v.propertyBody
        .partial()
        .strict()
        .refine((x) => Object.keys(x).length > 0)
        .parse(req.body);
    const result = await db.property.updateMany({
      where: { id, ownerId: res.locals.actor.id },
      data: input,
    });
    check(result.count, 404, "NOT_FOUND", "Property not found.");
    res.json({ data: await db.property.findUnique({ where: { id } }) });
  });
  r.get("/rooms", async (req, res) => {
    const q = v.roomQuery.parse(req.query);
    check(
      !q.minPrice ||
        !q.maxPrice ||
        new Prisma.Decimal(q.minPrice).lte(q.maxPrice),
      400,
      "VALIDATION_ERROR",
      "Invalid price range.",
    );
    const where: Prisma.RoomWhereInput = {
      ...roomScope(res.locals.actor),
      propertyId: q.propertyId,
      type: q.type,
      ...(q.q
        ? {
            OR: [
              { code: { contains: q.q, mode: "insensitive" } },
              { description: { contains: q.q, mode: "insensitive" } },
            ],
          }
        : {}),
      price: { gte: q.minPrice, lte: q.maxPrice },
    };
    res.json({
      data: await db.room.findMany({
        where,
        ...v.paging(q),
        orderBy: { id: "asc" },
      }),
    });
  });
  r.get("/rooms/:id", async (req, res) => {
    const a = res.locals.actor,
      id = v.id.parse(req.params.id);
    const data = await db.room.findFirst({
      where: {
        id,
        OR: [
          roomScope(a),
          ...(a.tenantId
            ? [{ contracts: { some: { tenantId: a.tenantId } } }]
            : []),
        ],
      },
    });
    check(data, 404, "NOT_FOUND", "Room not found.");
    res.json({ data });
  });
  r.post("/rooms", hostOnly, async (req, res) => {
    const input = v.roomBody.parse(req.body);
    const property = await db.property.findFirst({
      where: { id: input.propertyId, ownerId: res.locals.actor.id },
    });
    check(property, 404, "NOT_FOUND", "Property not found.");
    res.status(201).json({ data: await db.room.create({ data: input }) });
  });
  r.patch("/rooms/:id", hostOnly, async (req, res) => {
    const id = v.id.parse(req.params.id),
      input = v.roomPatch.parse(req.body),
      a = res.locals.actor;
    const data = await db.$transaction(async (tx) => {
      await lockRoom(tx, id);
      const room = await ownedRoom(tx, a, id);
      check(
        !input.listed || room.status === "vacant",
        409,
        "CONFLICT",
        "Only vacant rooms can be listed.",
      );
      check(
        !input.maxOccupants || input.maxOccupants >= room.currentOccupantsCount,
      );
      return tx.room.update({ where: { id }, data: input });
    }, transactionOptions);
    res.json({ data });
  });
  r.patch("/rooms/:id/status", hostOnly, async (req, res) => {
    const id = v.id.parse(req.params.id),
      { status } = z
        .object({ status: z.enum(["vacant", "maintenance"]) })
        .strict()
        .parse(req.body);
    const data = await db.$transaction(async (tx) => {
      await lockRoom(tx, id);
      const room = await ownedRoom(tx, res.locals.actor, id);
      check(
        ["vacant", "maintenance"].includes(room.status),
        409,
        "CONFLICT",
        "End contract or resolve reservation first.",
      );
      return tx.room.update({ where: { id }, data: { status, listed: false } });
    }, transactionOptions);
    res.json({ data });
  });
  r.delete("/rooms/:id", hostOnly, async (req, res) => {
    const id = v.id.parse(req.params.id);
    await db.$transaction(async (tx) => {
      await lockRoom(tx, id);
      const room = await ownedRoom(tx, res.locals.actor, id);
      check(room.status === "vacant");
      await tx.room.delete({ where: { id } });
    }, transactionOptions);
    res.status(204).end();
  });
  r.get("/tenants", hostOnly, async (req, res) => {
    const q = v.pageQuery.parse(req.query),
      ownerId = res.locals.actor.id;
    res.json({
      data: await db.tenant.findMany({
        where: {
          OR: [
            { contracts: { some: { room: { property: { ownerId } } } } },
            {
              user: {
                inquiries: {
                  some: { status: "accepted", room: { property: { ownerId } } },
                },
              },
            },
          ],
        },
        ...v.paging(q),
        orderBy: { id: "asc" },
      }),
    });
  });
  r.get("/contracts", async (req, res) => {
    const q = v.pageQuery.parse(req.query);
    res.json({
      data: await db.contract.findMany({
        where: privateScope(res.locals.actor),
        ...v.paging(q),
        orderBy: { id: "asc" },
      }),
    });
  });
  r.get("/contracts/:id", async (req, res) => {
    const data = await db.contract.findFirst({
      where: {
        id: v.id.parse(req.params.id),
        ...privateScope(res.locals.actor),
      },
    });
    check(data, 404, "NOT_FOUND", "Contract not found.");
    res.json({ data });
  });
  r.post("/contracts", hostOnly, async (req, res) => {
    res
      .status(201)
      .json({
        data: await createContract(
          db,
          res.locals.actor,
          v.contractBody.parse(req.body),
        ),
      });
  });
  r.post("/contracts/:id/end", hostOnly, async (req, res) => {
    const { endDate } = z.object({ endDate: v.date }).strict().parse(req.body);
    res.json({
      data: await endContract(
        db,
        res.locals.actor,
        v.id.parse(req.params.id),
        endDate,
      ),
    });
  });
  r.get("/invoices", async (req, res) => {
    const q = z
      .object({
        ...v.pagination,
        status: z.enum(["paid", "unpaid", "overdue"]).optional(),
      })
      .strict()
      .parse(req.query);
    const data = await db.invoice.findMany({
      where: { ...privateScope(res.locals.actor), status: q.status },
      ...v.paging(q),
      orderBy: { id: "asc" },
    });
    res.json({ data: data.map((i) => ({ ...i, total: invoiceTotal(i) })) });
  });
  r.get("/payments", async (req, res) => {
    const q = v.pageQuery.parse(req.query);
    const data = await db.invoice.findMany({
      where: { ...privateScope(res.locals.actor), status: "paid" },
      ...v.paging(q),
      orderBy: [{ paidAt: "desc" }, { id: "asc" }],
    });
    res.json({ data: data.map((i) => ({ ...i, total: invoiceTotal(i) })) });
  });
  r.get("/invoices/:id", async (req, res) => {
    const data = await db.invoice.findFirst({
      where: {
        id: v.id.parse(req.params.id),
        ...privateScope(res.locals.actor),
      },
    });
    check(data, 404, "NOT_FOUND", "Invoice not found.");
    res.json({ data: { ...data, total: invoiceTotal(data) } });
  });
  r.post("/invoices", hostOnly, async (req, res) => {
    res
      .status(201)
      .json({
        data: await createInvoice(
          db,
          res.locals.actor,
          v.invoiceBody.parse(req.body),
        ),
      });
  });
  r.post("/invoices/:id/pay", hostOnly, async (req, res) => {
    z.object({})
      .strict()
      .parse(req.body ?? {});
    const id = v.id.parse(req.params.id);
    const data = await db.$transaction(async (tx) => {
      const invoice = await tx.invoice.findFirst({
        where: { id, ...privateScope(res.locals.actor) },
      });
      check(invoice, 404, "NOT_FOUND", "Invoice not found.");
      await tx.invoice.updateMany({
        where: { id, status: { not: "paid" } },
        data: { status: "paid", paidAt: new Date() },
      });
      return tx.invoice.findUniqueOrThrow({ where: { id } });
    });
    res.json({ data: { ...data, total: invoiceTotal(data) } });
  });
  r.patch("/invoices/:id/status", hostOnly, async (req, res) => {
    const id = v.id.parse(req.params.id),
      { status } = z
        .object({ status: z.enum(["unpaid", "overdue"]) })
        .strict()
        .parse(req.body);
    const result = await db.invoice.updateMany({
      where: { id, ...privateScope(res.locals.actor), status: { not: "paid" } },
      data: { status },
    });
    check(
      result.count,
      409,
      "CONFLICT",
      "Invoice unavailable or already paid.",
    );
    res.status(204).end();
  });
  r.get("/inquiries", async (req, res) => {
    const q = v.pageQuery.parse(req.query),
      a = res.locals.actor;
    res.json({
      data: await db.inquiry.findMany({
        where:
          a.role === "host"
            ? { room: { property: { ownerId: a.id } } }
            : { userId: a.id },
        ...v.paging(q),
        orderBy: { id: "asc" },
      }),
    });
  });
  r.post("/inquiries", async (req, res) => {
    const a = res.locals.actor,
      input = v.inquiryBody.parse(req.body);
    check(
      a.role !== "host",
      403,
      "FORBIDDEN",
      "Tenant or viewer account required.",
    );
    const data = await db.$transaction(async (tx) => {
      await lockRoom(tx, input.roomId);
      const room = await tx.room.findFirst({
        where: { id: input.roomId, listed: true, status: "vacant" },
      });
      check(room, 409, "CONFLICT", "Room is not available.");
      const user = await tx.user.findUniqueOrThrow({ where: { id: a.id } });
      return tx.inquiry.create({
        data: {
          ...input,
          userId: a.id,
          name: user.fullName,
          phone: user.phone,
        },
      });
    }, transactionOptions);
    res.status(201).json({ data });
  });
  r.patch("/inquiries/:id/status", async (req, res) => {
    const a = res.locals.actor,
      id = v.id.parse(req.params.id);
    const { status } = z
      .object({
        status: z.enum(["contacted", "accepted", "rejected", "cancelled"]),
      })
      .strict()
      .parse(req.body);
    const data = await db.$transaction(async (tx) => {
      const item = await tx.inquiry.findFirst({
        where: {
          id,
          ...(a.role === "host"
            ? { room: { property: { ownerId: a.id } } }
            : { userId: a.id }),
        },
      });
      check(item, 404, "NOT_FOUND", "Inquiry not found.");
      check(
        a.role === "host" ? status !== "cancelled" : status === "cancelled",
        403,
        "FORBIDDEN",
        "Action not allowed.",
      );
      await lockRoom(tx, item.roomId);
      const current = await tx.inquiry.findUniqueOrThrow({ where: { id } });
      check(
        ["new", "contacted"].includes(current.status) ||
          (current.status === "accepted" && status === "cancelled"),
      );
      if (status === "accepted") {
        const room = await ownedRoom(tx, a, item.roomId);
        check(room.status === "vacant");
        await tx.room.update({
          where: { id: room.id },
          data: { status: "reserved", listed: false },
        });
        await tx.inquiry.updateMany({
          where: {
            roomId: room.id,
            id: { not: id },
            status: { in: ["new", "contacted"] },
          },
          data: { status: "rejected" },
        });
      }
      if (current.status === "accepted" && status === "cancelled") {
        const room = await tx.room.findUniqueOrThrow({
          where: { id: item.roomId },
        });
        check(
          room.status === "reserved",
          409,
          "CONFLICT",
          "Contract already created.",
        );
        await tx.room.update({
          where: { id: room.id },
          data: { status: "vacant", listed: false },
        });
      }
      return tx.inquiry.update({ where: { id }, data: { status } });
    }, transactionOptions);
    res.json({ data });
  });
  r.get("/repairs", async (req, res) => {
    const q = v.pageQuery.parse(req.query);
    res.json({
      data: await db.repairRequest.findMany({
        where: privateScope(res.locals.actor),
        ...v.paging(q),
        orderBy: { id: "asc" },
      }),
    });
  });
  r.post("/repairs", async (req, res) => {
    const a = res.locals.actor,
      input = v.repairBody.parse(req.body);
    check(
      a.role === "tenant" && a.tenantId,
      403,
      "FORBIDDEN",
      "Tenant account required.",
    );
    const tenantId = a.tenantId;
    const data = await db.$transaction(async (tx) => {
      await lockRoom(tx, input.roomId);
      const contract = await tx.contract.findFirst({
        where: { roomId: input.roomId, tenantId, active: true },
      });
      check(contract, 404, "NOT_FOUND", "Active rental not found.");
      return tx.repairRequest.create({
        data: { ...input, tenantId: contract.tenantId },
      });
    }, transactionOptions);
    res.status(201).json({ data });
  });
  r.patch("/repairs/:id/status", async (req, res) => {
    const a = res.locals.actor,
      id = v.id.parse(req.params.id);
    const { status } = z
      .object({ status: z.enum(["in_progress", "completed", "cancelled"]) })
      .strict()
      .parse(req.body);
    check(
      a.role === "host" || status === "cancelled",
      403,
      "FORBIDDEN",
      "Action not allowed.",
    );
    const allowed =
      status === "in_progress"
        ? ["pending"]
        : status === "completed"
          ? ["in_progress"]
          : ["pending"];
    const result = await db.repairRequest.updateMany({
      where: {
        id,
        ...privateScope(a),
        status: { in: allowed as ("pending" | "in_progress")[] },
      },
      data: { status },
    });
    check(
      result.count,
      409,
      "CONFLICT",
      "Repair unavailable or invalid transition.",
    );
    res.status(204).end();
  });
  r.get("/favorites", async (req, res) => {
    const q = v.pageQuery.parse(req.query);
    res.json({
      data: await db.favorite.findMany({
        where: {
          userId: res.locals.actor.id,
          room: { listed: true, status: "vacant" },
        },
        include: { room: true },
        ...v.paging(q),
        orderBy: { id: "asc" },
      }),
    });
  });
  r.put("/favorites/:id", async (req, res) => {
    const roomId = v.id.parse(req.params.id),
      userId = res.locals.actor.id;
    const room = await db.room.findFirst({
      where: { id: roomId, listed: true, status: "vacant" },
    });
    check(room, 404, "NOT_FOUND", "Listed room not found.");
    res.json({
      data: await db.favorite.upsert({
        where: { userId_roomId: { userId, roomId } },
        create: { userId, roomId },
        update: {},
      }),
    });
  });
  r.delete("/favorites/:id", async (req, res) => {
    await db.favorite.deleteMany({
      where: { roomId: v.id.parse(req.params.id), userId: res.locals.actor.id },
    });
    res.status(204).end();
  });
  return r;
}
