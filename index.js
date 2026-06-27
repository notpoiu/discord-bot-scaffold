import "dotenv/config";

import { Client, Collection, Events, GatewayIntentBits, MessageFlags } from "discord.js";

import Logger from "./logger.js";
import { loadCommandModules, synchronizeSlashCommands } from "./utils/rest.js";

const requiredEnvironment = ["BOT_TOKEN", "CLIENT_ID"];
const missingEnvironment = requiredEnvironment.filter((key) => !process.env[key]);

if (missingEnvironment.length > 0) {
  Logger.error(`Missing required environment variable(s): ${missingEnvironment.join(", ")}`);
  process.exit(1);
}

console.log(`    Discord Bot Scaffold

    ┌ ○ Environment: ${process.env.NODE_ENV || "development"}
    ├ ○ Version: ${process.env.VERSION || "1.0.0"}
    └ ○ Node.js Version: ${process.version}
`);

export const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.commands = new Collection();

client.once(Events.ClientReady, async (readyClient) => {
  Logger.success(`Logged in as ${readyClient.user.tag}`);

  const commands = await loadCommandModules();

  for (const command of commands) {
    client.commands.set(command.data.name, command);
  }

  await synchronizeSlashCommands(commands.map((command) => command.data));
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = interaction.client.commands.get(interaction.commandName);

  if (!command) {
    Logger.warn(`No command matching /${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    Logger.error(error?.stack || error?.message || String(error));

    const response = {
      content: "There was an error while executing this command.",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  }
});

client.login(process.env.BOT_TOKEN);

