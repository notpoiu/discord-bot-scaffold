import {
  ApplicationIntegrationType,
  InteractionContextType,
  SlashCommandBuilder,
} from "discord.js";

import { createPingResponse } from "../../interactions/buttons/ping-refresh.js";
import type { BotCommand } from "../../types.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online.")
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.BotDM, InteractionContextType.PrivateChannel, InteractionContextType.Guild),

  async execute(interaction) {
    const startedAt = Date.now();

    await interaction.reply(createPingResponse("Checking Discord API latency...", interaction.client.ws.ping));

    const latency = Date.now() - startedAt;

    await interaction.editReply(createPingResponse(`Discord API latency: **${latency}ms**`, interaction.client.ws.ping));
  },
};

export default command;
