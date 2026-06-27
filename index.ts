import { createApp } from "./app.js";

const app = createApp();
app.listenForShutdown();

try {
  await app.start();
} catch (error) {
  app.context.logger.error(
    error instanceof Error ? error.stack || error.message : String(error),
  );
  await app.stop();
  process.exit(1);
}
