import { Prisma, PrismaClient } from "@prisma/client";
import type { Actor } from "../middlewares/auth";
import { check } from "../utils/errors";
export type Db = PrismaClient | Prisma.TransactionClient;
export function roomScope(actor: Actor): Prisma.RoomWhereInput {
  return actor.role === "host"
    ? { property: { ownerId: actor.id } }
    : { listed: true, status: "vacant" };
}
export function privateScope(actor: Actor) {
  return actor.role === "host"
    ? { room: { property: { ownerId: actor.id } } }
    : { tenantId: actor.tenantId ?? "00000000-0000-0000-0000-000000000000" };
}
export async function ownedRoom(db: Db, actor: Actor, id: string) {
  const room = await db.room.findFirst({
    where: { id, property: { ownerId: actor.id } },
  });
  check(actor.role === "host" && room, 404, "NOT_FOUND", "Room not found.");
  return room;
}
export async function lockRoom(db: Prisma.TransactionClient, id: string) {
  await db.$queryRaw(
    Prisma.sql`SELECT id FROM "Room" WHERE id = ${id}::uuid FOR UPDATE`,
  );
}
export const publicUser = {
  id: true,
  username: true,
  role: true,
  fullName: true,
  phone: true,
  isDepositPaid: true,
  tenantId: true,
  createdAt: true,
  updatedAt: true,
} as const;
