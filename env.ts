import "dotenv/config";

import { z } from "zod";

import Logger from "./logger.js";

const envSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN is required"),
  CLIENT_ID: z.string().min(1, "CLIENT_ID is required"),
  GUILD_ID: z.string().min(1).optional(),
  NODE_ENV: z.string().default("development"),
  VERSION: z.string().default("1.0.0"),
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `- ${issue.path.join(".")}: ${issue.message}`)
    .join("\n");

  Logger.error(`Invalid environment:\n${issues}`);
  process.exit(1);
}

export const env = parsedEnv.data;
