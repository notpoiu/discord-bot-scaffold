import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { REST, Routes } from "discord.js";

import Logger from "../logger.js";
import type { BotCommand, CommandData, CommandMiddleware } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsRoot = path.join(__dirname, "..", "commands");
const commandExtensions = new Set([".js", ".ts"]);
const middlewareNames = ["middleware.ts", "middleware.js"];

const importFresh = async (filePath: string) => {
  const url = pathToFileURL(filePath);
  url.searchParams.set("updated", Date.now().toString());

  return import(url.href) as Promise<{ default?: unknown; middleware?: unknown }>;
};

const isBotCommand = (command: unknown): command is BotCommand => {
  if (!command || typeof command !== "object") {
    return false;
  }

  const maybeCommand = command as Partial<BotCommand>;
  const maybeData = maybeCommand.data as Partial<CommandData> | undefined;

  return Boolean(
    maybeData &&
      typeof maybeData === "object" &&
      typeof maybeData.name === "string" &&
      typeof maybeData.toJSON === "function" &&
      typeof maybeCommand.execute === "function",
  );
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

const isCommandMiddleware = (middleware: unknown): middleware is CommandMiddleware => {
  return typeof middleware === "function";
};

const isCommandFile = (filePath: string) => {
  return (
    commandExtensions.has(path.extname(filePath)) &&
    !filePath.endsWith(".d.ts") &&
    path.basename(filePath, path.extname(filePath)) !== "middleware"
  );
};

const getCommandFiles = (directory: string): string[] => {
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getCommandFiles(entryPath);
      }

      if (entry.isFile() && isCommandFile(entryPath)) {
        return [entryPath];
      }

      return [];
    })
    .sort();
};

const getMiddlewarePaths = (commandFilePath: string) => {
  const commandDirectory = path.dirname(commandFilePath);
  const relativeDirectory = path.relative(commandsRoot, commandDirectory);
  const directories = [commandsRoot];

  if (relativeDirectory) {
    const segments = relativeDirectory.split(path.sep);

    for (let index = 0; index < segments.length; index += 1) {
      directories.push(path.join(commandsRoot, ...segments.slice(0, index + 1)));
    }
  }

  return directories
    .map((directory) => {
      return middlewareNames.map((file) => path.join(directory, file)).find((filePath) => fs.existsSync(filePath));
    })
    .filter((filePath): filePath is string => Boolean(filePath));
};

const loadMiddlewareFile = async (filePath: string) => {
  try {
    const output = await importFresh(filePath);
    const middleware = output.default ?? output.middleware ?? output;

    if (isCommandMiddleware(middleware)) {
      return middleware;
    }

    Logger.warn(`The middleware at ${filePath} must export one function.`);
  } catch (error) {
    Logger.error(`Failed to import command middleware from ${filePath}: ${getErrorMessage(error)}`);
  }

  return undefined;
};

const loadMiddlewareForCommand = async (
  commandFilePath: string,
  middlewareCache: Map<string, CommandMiddleware | undefined>,
) => {
  const middleware: CommandMiddleware[] = [];

  for (const filePath of getMiddlewarePaths(commandFilePath)) {
    if (!middlewareCache.has(filePath)) {
      middlewareCache.set(filePath, await loadMiddlewareFile(filePath));
    }

    const cachedMiddleware = middlewareCache.get(filePath);

    if (cachedMiddleware) {
      middleware.push(cachedMiddleware);
    }
  }

  return middleware;
};

export const loadCommandModules = async () => {
  const commands: BotCommand[] = [];
  const middlewareCache = new Map<string, CommandMiddleware | undefined>();

  if (!fs.existsSync(commandsRoot)) {
    Logger.warn("No commands directory found.");
    return commands;
  }

  for (const filePath of getCommandFiles(commandsRoot)) {
    try {
      const output = await importFresh(filePath);
      const command = output.default || output;

      if (isBotCommand(command)) {
        command.middleware = await loadMiddlewareForCommand(filePath, middlewareCache);
        commands.push(command);
        continue;
      }

      Logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
    } catch (error) {
      Logger.error(`Failed to import command from ${filePath}: ${getErrorMessage(error)}`);
    }
  }

  return commands;
};

export const getSlashCommands = async () => {
  const commands = await loadCommandModules();
  return commands.map((command) => command.data);
};

export const synchronizeSlashCommands = async (commands: CommandData[]) => {
  const { env } = await import("../env.js");
  const rest = new REST({ version: "10" }).setToken(env.BOT_TOKEN);
  const route = env.GUILD_ID
    ? Routes.applicationGuildCommands(env.CLIENT_ID, env.GUILD_ID)
    : Routes.applicationCommands(env.CLIENT_ID);

  Logger.info(`Synchronizing ${commands.length} slash command(s) with Discord...`);

  await rest.put(route, {
    body: commands.map((command) => command.toJSON()),
  });

  for (let index = 0; index < commands.length; index += 1) {
    const marker = index === 0 ? "┌" : index === commands.length - 1 ? "└" : "├";
    Logger.info(`${marker} ƒ /${commands[index].name}`);
  }

  Logger.success("Slash commands synchronized.");
};

export const GetSlashCommands = getSlashCommands;
export const SynchronizeSlashCommands = synchronizeSlashCommands;
