import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { REST, Routes } from "discord.js";

import Logger from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const commandsRoot = path.join(__dirname, "..", "commands");

const importFresh = async (filePath) => {
  const url = pathToFileURL(filePath);
  url.searchParams.set("updated", Date.now().toString());

  return import(url.href);
};

export const loadCommandModules = async () => {
  const commands = [];

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
    const commandFiles = fs.readdirSync(folderPath).filter((file) => file.endsWith(".js"));

    for (const file of commandFiles) {
      const filePath = path.join(folderPath, file);

      try {
        const output = await importFresh(filePath);
        const command = output.default || output;

        if ("data" in command && "execute" in command) {
          commands.push(command);
          continue;
        }

        Logger.warn(`The command at ${filePath} is missing a required "data" or "execute" property.`);
      } catch (error) {
        Logger.error(`Failed to import command from ${filePath}: ${error.message}`);
      }
    }
  }

  return commands;
};

export const getSlashCommands = async () => {
  const commands = await loadCommandModules();
  return commands.map((command) => command.data);
};

export const synchronizeSlashCommands = async (commands) => {
  const rest = new REST({ version: "10" }).setToken(process.env.BOT_TOKEN);
  const route = process.env.GUILD_ID
    ? Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID)
    : Routes.applicationCommands(process.env.CLIENT_ID);

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

