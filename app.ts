import {
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Interaction,
  type InteractionReplyOptions,
  type ModalSubmitInteraction,
} from "discord.js";

import defaultConfig from "./bot.config.js";
import type { BotConfig } from "./config.js";
import { env } from "./env.js";
import Logger from "./logger.js";
import { ServiceRegistry } from "./services.js";
import { setupAddons, startAddons, stopAddons } from "./utils/addons.js";
import { loadInteractionHandlers, parseCustomId } from "./utils/interactions.js";
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
    buttons: new Collection(),
    modals: new Collection(),
    services: new ServiceRegistry(),
    addons: [],
    startedAt: Date.now(),
  };
};

const runCommandMiddleware = async (context: AppContext, interaction: ChatInputCommandInteraction) => {
  const command = context.commands.get(interaction.commandName);

  for (const middleware of command?.middleware ?? []) {
    const shouldContinue = await middleware(interaction, context);

    if (shouldContinue === false) {
      return false;
    }
  }

  return true;
};

const replyWithInteractionError = async (interaction: Interaction) => {
  if (!interaction.isRepliable()) {
    return;
  }

  const response: InteractionReplyOptions = {
    content: "There was an error while executing this interaction.",
    flags: MessageFlags.Ephemeral,
  };

  if (interaction.replied || interaction.deferred) {
    await interaction.followUp(response);
    return;
  }

  await interaction.reply(response);
};

const handleCommandInteraction = async (context: AppContext, interaction: ChatInputCommandInteraction) => {
  const command = context.commands.get(interaction.commandName);

  if (!command) {
    Logger.warn(`No command matching /${interaction.commandName} was found.`);
    return;
  }

  const shouldRunCommand = await runCommandMiddleware(context, interaction);

  if (!shouldRunCommand) {
    return;
  }

  await command.execute(interaction, context);
};

const handleButtonInteraction = async (context: AppContext, interaction: ButtonInteraction) => {
  const parsedCustomId = parseCustomId(interaction.customId);
  const button = context.buttons.get(parsedCustomId.id);

  if (!button) {
    Logger.warn(`No button handler matching "${parsedCustomId.id}" was found for "${interaction.customId}".`);
    return;
  }

  await button.execute(interaction, context, parsedCustomId.params);
};

const handleModalInteraction = async (context: AppContext, interaction: ModalSubmitInteraction) => {
  const parsedCustomId = parseCustomId(interaction.customId);
  const modal = context.modals.get(parsedCustomId.id);

  if (!modal) {
    Logger.warn(`No modal handler matching "${parsedCustomId.id}" was found for "${interaction.customId}".`);
    return;
  }

  await modal.submit(interaction, context, parsedCustomId.params);
};

const handleInteraction = async (context: AppContext, interaction: Interaction) => {
  try {
    if (interaction.isAutocomplete()) {
      const command = context.commands.get(interaction.commandName);
      await command?.autocomplete?.(interaction, context);
      return;
    }

    if (interaction.isChatInputCommand()) {
      await handleCommandInteraction(context, interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(context, interaction);
      return;
    }

    if (interaction.isModalSubmit()) {
      await handleModalInteraction(context, interaction);
    }
  } catch (error) {
    Logger.error(error instanceof Error ? error.stack || error.message : String(error));
    await replyWithInteractionError(interaction);
  }
};

export const createApp = (config = defaultConfig) => {
  const context = createContext(config);
  const loadedAddons: Addon[] = config.addons;
  let stopped = false;

  const start = async () => {
    printBanner();

    const [loadedCommands, loadedInteractions] = await Promise.all([
      loadCommandModules(),
      loadInteractionHandlers(),
    ]);

    for (const command of loadedCommands) {
      context.commands.set(command.data.name, command);
    }

    for (const [id, button] of loadedInteractions.buttons) {
      context.buttons.set(id, button);
    }

    for (const [id, modal] of loadedInteractions.modals) {
      context.modals.set(id, modal);
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
