import { Router } from "express";
import type { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { rateLimit } from "express-rate-limit";
import { z } from "zod";
import { Sessions } from "../services/sessions";
import { authenticate } from "../middlewares/auth";
import { check } from "../utils/errors";
import { password, username, text, phone, profileBody } from "../validators";
import { publicUser } from "../services/access";
// One valid hash for constant-work comparisons when a username does not exist.
const dummyHash = bcrypt.hash("dummy-password-never-used", 12);
export function authRoutes(db: PrismaClient, sessions: Sessions) {
  const r = Router();
  const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
      error: { code: "RATE_LIMITED", message: "Too many attempts; try later." },
    },
  });
  r.post("/register", limiter, async (req, res) => {
    const input = z
      .object({ username, password, fullName: text, phone })
      .strict()
      .parse(req.body);
    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await db.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: { fullName: input.fullName, phone: input.phone },
      });
      return tx.user.create({
        data: {
          username: input.username,
          passwordHash,
          fullName: input.fullName,
          phone: input.phone,
          role: "tenant",
          tenantId: tenant.id,
        },
        select: publicUser,
      });
    });
    res.status(201).json({ data: user });
  });
  r.post("/login", limiter, async (req, res) => {
    const input = z.object({ username, password }).strict().parse(req.body);
    const user = await db.user.findUnique({
      where: { username: input.username },
    });
    const valid = await bcrypt.compare(
      input.password,
      user?.passwordHash ?? (await dummyHash),
    );
    check(user && valid, 401, "UNAUTHORIZED", "Invalid username or password.");
    res.json({ data: sessions.issue(user.id, user.passwordHash) });
  });
  r.use(authenticate(db, sessions));
  r.post("/logout", (_req, res) => {
    sessions.revoke(res.locals.token);
    res.status(204).end();
  });
  r.get("/me", async (_req, res) => {
    res.json({
      data: await db.user.findUnique({
        where: { id: res.locals.actor.id },
        select: publicUser,
      }),
    });
  });
  r.patch("/me", async (req, res) => {
    const input = profileBody.parse(req.body);
    const user = await db.$transaction(async (tx) => {
      const updated = await tx.user.update({
        where: { id: res.locals.actor.id },
        data: input,
        select: publicUser,
      });
      if (updated.tenantId)
        await tx.tenant.update({
          where: { id: updated.tenantId },
          data: input,
        });
      return updated;
    });
    res.json({ data: user });
  });
  r.post("/change-password", limiter, async (req, res) => {
    const input = z
      .object({ currentPassword: password, newPassword: password })
      .strict()
      .parse(req.body);
    const user = await db.user.findUniqueOrThrow({
      where: { id: res.locals.actor.id },
    });
    check(
      await bcrypt.compare(input.currentPassword, user.passwordHash),
      401,
      "UNAUTHORIZED",
      "Current password is incorrect.",
    );
    const passwordHash = await bcrypt.hash(input.newPassword, 12);
    const changed = await db.user.updateMany({
      where: { id: user.id, passwordHash: user.passwordHash },
      data: { passwordHash },
    });
    check(changed.count === 1);
    sessions.revokeUser(user.id);
    res.status(204).end();
  });
  return r;
}
