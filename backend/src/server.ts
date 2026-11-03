import { readConfig } from "./config/env";
import { prisma } from "./config/prisma";
import { createApp } from "./app";
import { Sessions } from "./services/sessions";
async function main() {
  const config = readConfig();
  await prisma.$connect();
  const app = createApp(prisma, {
    origins: config.CORS_ORIGINS.split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    sessions: new Sessions(config.SESSION_TTL_SECONDS * 1000),
  });
  const server = app.listen(config.PORT, config.HOST, () =>
    console.log("TroHome API listening on port " + config.PORT),
  );
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const timer = setTimeout(() => {
      server.closeAllConnections();
      void prisma.$disconnect().finally(() => process.exit(1));
    }, 10000);
    timer.unref();
    server.close(() => {
      void prisma.$disconnect().finally(() => {
        clearTimeout(timer);
        process.exit(0);
      });
    });
  };
  process.on("SIGINT", stop);
  process.on("SIGTERM", stop);
  server.on("error", () => {
    console.error("Server could not bind configured address.");
    void prisma.$disconnect().finally(() => process.exit(1));
  });
}
void main().catch(async () => {
  console.error(
    "Backend startup failed. Check configuration and database availability.",
  );
  await prisma.$disconnect();
  process.exitCode = 1;
});
