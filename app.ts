import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type Interaction,
  type InteractionReplyOptions,
} from "discord.js";

import defaultConfig from "./bot.config.js";
import type { BotConfig } from "./config.js";
import { env } from "./env.js";
import Logger from "./logger.js";
import { ServiceRegistry } from "./services.js";
import { setupAddons, startAddons, stopAddons } from "./utils/addons.js";
import { loadCommandModules, synchronizeSlashCommands } from "./utils/rest.js";
import type { Addon, AppContext } from "./types.js";

const printBanner = () => {
  console.log(`    Discord Bot

    ┌ ○ Environment: ${env.NODE_ENV}
    ├ ○ Version: ${env.VERSION}
    └ ○ Node.js Version: ${process.version}
`);
};

const createContext = (config: Required<BotConfig>): AppContext => {
  return {
    env,
    config,
    logger: Logger,
    client: new Client({
      intents: [GatewayIntentBits.Guilds],
    }),
    commands: new Collection(),
    services: new ServiceRegistry(),
    addons: [],
    startedAt: Date.now(),
  };
};

const runCommandMiddleware = async (context: AppContext, interaction: Interaction) => {
  if (!interaction.isChatInputCommand()) {
    return false;
  }

  const command = context.commands.get(interaction.commandName);

  for (const middleware of command?.middleware ?? []) {
    const shouldContinue = await middleware(interaction, context);

    if (shouldContinue === false) {
      return false;
    }
  }

  return true;
};

const handleInteraction = async (context: AppContext, interaction: Interaction) => {
  if (interaction.isAutocomplete()) {
    const command = context.commands.get(interaction.commandName);
    await command?.autocomplete?.(interaction, context);
    return;
  }

  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = context.commands.get(interaction.commandName);

  if (!command) {
    Logger.warn(`No command matching /${interaction.commandName} was found.`);
    return;
  }

  try {
    const shouldRunCommand = await runCommandMiddleware(context, interaction);

    if (!shouldRunCommand) {
      return;
    }

    await command.execute(interaction, context);
  } catch (error) {
    Logger.error(error instanceof Error ? error.stack || error.message : String(error));

    const response: InteractionReplyOptions = {
      content: "There was an error while executing this command.",
      flags: MessageFlags.Ephemeral,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(response);
      return;
    }

    await interaction.reply(response);
  }
};

export const createApp = (config = defaultConfig) => {
  const context = createContext(config);
  const loadedAddons: Addon[] = config.addons;
  let stopped = false;

  const start = async () => {
    printBanner();

    const loadedCommands = await loadCommandModules();

    for (const command of loadedCommands) {
      context.commands.set(command.data.name, command);
    }

    await setupAddons(context, loadedAddons);
    await startAddons(context, loadedAddons);

    context.client.once(Events.ClientReady, async (readyClient) => {
      Logger.success(`Logged in as ${readyClient.user.tag}`);
      await synchronizeSlashCommands(loadedCommands.map((command) => command.data));
    });

    context.client.on(Events.InteractionCreate, (interaction) => {
      void handleInteraction(context, interaction);
    });

    await context.client.login(env.BOT_TOKEN);
  };

  const stop = async () => {
    if (stopped) {
      return;
    }

    stopped = true;
    await stopAddons(context, loadedAddons);
    context.client.destroy();
  };

  const listenForShutdown = () => {
    const shutdown = (signal: NodeJS.Signals) => {
      Logger.info(`Received ${signal}; shutting down...`);

      void stop().finally(() => {
        process.exit(0);
      });
    };

    process.once("SIGINT", shutdown);
    process.once("SIGTERM", shutdown);
  };

  return {
    context,
    start,
    stop,
    listenForShutdown,
  };
};
