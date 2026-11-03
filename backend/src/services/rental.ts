import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";
import type { Actor } from "../middlewares/auth";
import { check } from "../utils/errors";
import { contractBody, invoiceBody } from "../validators";
import { lockRoom, ownedRoom } from "./access";
export const transactionOptions = {
  isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
};
export async function createContract(
  db: PrismaClient,
  actor: Actor,
  input: z.infer<typeof contractBody>,
) {
  return db.$transaction(async (tx) => {
    await lockRoom(tx, input.roomId);
    const room = await ownedRoom(tx, actor, input.roomId);
    check(["vacant", "reserved"].includes(room.status));
    // An accepted inquiry is the consent/ownership bridge for a new tenant.
    const tenant = await tx.tenant.findFirst({
      where: {
        id: input.tenantId,
        OR: [
          {
            contracts: { some: { room: { property: { ownerId: actor.id } } } },
          },
          {
            user: {
              inquiries: { some: { roomId: room.id, status: "accepted" } },
            },
          },
        ],
      },
    });
    check(
      tenant,
      404,
      "NOT_FOUND",
      "Eligible tenant not found. Accept their inquiry first.",
    );
    if (room.status === "reserved") {
      const reservation = await tx.inquiry.findFirst({
        where: {
          roomId: room.id,
          status: "accepted",
          user: { tenantId: tenant.id },
        },
      });
      check(
        reservation,
        409,
        "CONFLICT",
        "Room is reserved for another tenant.",
      );
    }
    const contract = await tx.contract.create({
      data: {
        ...input,
        startDate: new Date(input.startDate),
        endDate: input.endDate ? new Date(input.endDate) : null,
      },
    });
    await tx.room.update({
      where: { id: room.id },
      data: { status: "occupied", listed: false, currentOccupantsCount: 1 },
    });
    return contract;
  }, transactionOptions);
}
export async function endContract(
  db: PrismaClient,
  actor: Actor,
  contractId: string,
  endDate: string,
) {
  return db.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: { id: contractId, room: { property: { ownerId: actor.id } } },
    });
    check(
      actor.role === "host" && contract,
      404,
      "NOT_FOUND",
      "Contract not found.",
    );
    await lockRoom(tx, contract.roomId);
    check(
      contract.active &&
        endDate > contract.startDate.toISOString().slice(0, 10),
      409,
      "CONFLICT",
      "Contract is closed or end date is invalid.",
    );
    const changed = await tx.contract.updateMany({
      where: { id: contractId, active: true },
      data: { active: false, endDate: new Date(endDate) },
    });
    check(changed.count === 1);
    await tx.room.update({
      where: { id: contract.roomId },
      data: { status: "vacant", listed: false, currentOccupantsCount: 0 },
    });
    await tx.inquiry.updateMany({
      where: {
        roomId: contract.roomId,
        status: "accepted",
        user: { tenantId: contract.tenantId },
      },
      data: { status: "cancelled" },
    });
    return tx.contract.findUniqueOrThrow({ where: { id: contractId } });
  }, transactionOptions);
}
export function invoiceTotal(i: {
  rent: Prisma.Decimal;
  electricityNew: Prisma.Decimal;
  electricityOld: Prisma.Decimal;
  electricityRate: Prisma.Decimal;
  waterNew: Prisma.Decimal;
  waterOld: Prisma.Decimal;
  waterRate: Prisma.Decimal;
  other: Prisma.Decimal;
}) {
  return i.rent
    .add(i.electricityNew.sub(i.electricityOld).mul(i.electricityRate))
    .add(i.waterNew.sub(i.waterOld).mul(i.waterRate))
    .add(i.other)
    .toFixed(2);
}
export async function createInvoice(
  db: PrismaClient,
  actor: Actor,
  input: z.infer<typeof invoiceBody>,
) {
  return db.$transaction(async (tx) => {
    const contract = await tx.contract.findFirst({
      where: {
        id: input.contractId,
        room: { property: { ownerId: actor.id } },
      },
      include: { room: true },
    });
    check(
      actor.role === "host" && contract,
      404,
      "NOT_FOUND",
      "Contract not found.",
    );
    await lockRoom(tx, contract.roomId);
    const start = contract.startDate.toISOString().slice(0, 7),
      end = contract.endDate?.toISOString().slice(0, 7);
    check(
      input.period >= start && (!end || input.period <= end),
      409,
      "INVALID_PERIOD",
      "Period must fall within the contract.",
    );
    const invoice = await tx.invoice.create({
      data: {
        ...input,
        roomId: contract.roomId,
        tenantId: contract.tenantId,
        rent: contract.monthlyRent,
        electricityRate: contract.room.electricityRate,
        waterRate: contract.room.waterRate,
      },
    });
    return { ...invoice, total: invoiceTotal(invoice) };
  }, transactionOptions);
}
