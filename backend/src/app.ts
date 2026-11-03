import express from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import type { PrismaClient } from "@prisma/client";
import { Sessions } from "./services/sessions";
import { authRoutes } from "./routes/auth";
import { resourceRoutes } from "./routes/resources";
import { authenticate } from "./middlewares/auth";
import { ApiError, errorHandler } from "./utils/errors";
export function createApp(
  db: PrismaClient,
  options: { origins?: string[]; sessions?: Sessions } = {},
) {
  const app = express(),
    sessions = options.sessions ?? new Sessions();
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin || (options.origins ?? []).includes(origin))
          callback(null, true);
        else
          callback(new ApiError(403, "CORS_DENIED", "Origin is not allowed."));
      },
      credentials: false,
    }),
  );
  app.use(
    rateLimit({
      windowMs: 60000,
      limit: 300,
      standardHeaders: "draft-8",
      legacyHeaders: false,
      message: {
        error: { code: "RATE_LIMITED", message: "Too many requests." },
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use((_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", async (_req, res) => {
    try {
      await db.$queryRaw`SELECT 1`;
      res.json({ data: { status: "ok", database: "connected" } });
    } catch {
      res
        .status(503)
        .json({
          error: {
            code: "DATABASE_UNAVAILABLE",
            message: "Database unavailable.",
          },
        });
    }
  });
  app.use("/api/auth", authRoutes(db, sessions));
  app.use("/api", authenticate(db, sessions), resourceRoutes(db));
  app.use((_req, _res, next) =>
    next(new ApiError(404, "NOT_FOUND", "Endpoint not found.")),
  );
  app.use(errorHandler);
  return app;
}
