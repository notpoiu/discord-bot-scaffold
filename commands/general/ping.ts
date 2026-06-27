import {
  ApplicationIntegrationType,
  InteractionContextType,
  MessageFlags,
  SlashCommandBuilder,
} from "discord.js";

import type { BotCommand } from "../../types.js";
import { CreateEmbed } from "../../utils/message.js";

const command: BotCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Check whether the bot is online.")
    .setIntegrationTypes(ApplicationIntegrationType.UserInstall, ApplicationIntegrationType.GuildInstall)
    .setContexts(InteractionContextType.BotDM, InteractionContextType.PrivateChannel, InteractionContextType.Guild),

  async execute(interaction) {
    const startedAt = Date.now();

    await interaction.reply({
      components: [
        CreateEmbed({
          title: "Pong",
          description: "Checking Discord API latency...",
          footer: `WebSocket latency: ${interaction.client.ws.ping}ms`,
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
    });

    const latency = Date.now() - startedAt;

    await interaction.editReply({
      components: [
        CreateEmbed({
          title: "Pong",
          description: `Discord API latency: **${latency}ms**`,
          footer: `WebSocket latency: ${interaction.client.ws.ping}ms`,
        }),
      ],
      flags: MessageFlags.IsComponentsV2,
    });
  },
};

export default command;
