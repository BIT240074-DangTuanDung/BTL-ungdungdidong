import type { RequestHandler } from "express";
import type { PrismaClient, User } from "@prisma/client";
import { ApiError } from "../utils/errors";
import { Sessions } from "../services/sessions";
export type Actor = Pick<User, "id" | "role" | "tenantId">;
declare module "express-serve-static-core" {
  interface Locals {
    actor: Actor;
    token: string;
  }
}
export function authenticate(
  db: PrismaClient,
  sessions: Sessions,
): RequestHandler {
  return async (req, res, next) => {
    const match = /^Bearer ([A-Za-z0-9_-]{43})$/.exec(
      req.headers.authorization ?? "",
    );
    const userId = match && sessions.read(match[1])?.userId;
    if (!userId)
      throw new ApiError(401, "UNAUTHORIZED", "Invalid or expired session.");
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, tenantId: true, passwordHash: true },
    });
    if (!user) throw new ApiError(401, "UNAUTHORIZED", "Invalid session.");
    if (!sessions.matchesCredential(match![1], user.passwordHash ?? ""))
      throw new ApiError(
        401,
        "UNAUTHORIZED",
        "Credentials changed; sign in again.",
      );
    res.locals.actor = {
      id: user.id,
      role: user.role,
      tenantId: user.tenantId,
    };
    res.locals.token = match![1];
    next();
  };
}
export const hostOnly: RequestHandler = (_req, res, next) => {
  if (res.locals.actor.role !== "host")
    throw new ApiError(403, "FORBIDDEN", "Host access required.");
  next();
};
