import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { REST, Routes } from "discord.js";

import Logger from "../logger.js";
import type { BotCommand, CommandData } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsRoot = path.join(__dirname, "..", "commands");
const commandExtensions = new Set([".js", ".ts"]);

const importFresh = async (filePath: string) => {
  const url = pathToFileURL(filePath);
  url.searchParams.set("updated", Date.now().toString());

  return import(url.href) as Promise<{ default?: unknown }>;
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

export const loadCommandModules = async () => {
  const commands: BotCommand[] = [];

  if (!fs.existsSync(commandsRoot)) {
    Logger.warn("No commands directory found.");
    return commands;
  }

  const commandFolders = fs
    .readdirSync(commandsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  for (const folder of commandFolders) {
    const folderPath = path.join(commandsRoot, folder);
    const commandFiles = fs
      .readdirSync(folderPath)
      .filter((file) => commandExtensions.has(path.extname(file)) && !file.endsWith(".d.ts"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);

      try {
        const output = await importFresh(filePath);
        const command = output.default || output;

        if (isBotCommand(command)) {
          commands.push(command);
          continue;
        }

        Logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      } catch (error) {
        Logger.error(`Failed to import command from ${filePath}: ${getErrorMessage(error)}`);
      }
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
