import "dotenv/config";
import { z } from "zod";
export function readConfig() {
  const result = z
    .object({
      DATABASE_URL: z.string().min(1),
      PORT: z.coerce.number().int().min(1).max(65535).default(3001),
      HOST: z.string().default("127.0.0.1"),
      NODE_ENV: z
        .enum(["development", "test", "production"])
        .default("development"),
      CORS_ORIGINS: z.string().default("http://localhost:8081"),
      SESSION_TTL_SECONDS: z.coerce
        .number()
        .int()
        .min(60)
        .max(86400)
        .default(3600),
    })
    .safeParse(process.env);
  if (!result.success)
    throw new Error(
      "Invalid server configuration; check .env variable names and formats.",
    );
  return result.data;
}
