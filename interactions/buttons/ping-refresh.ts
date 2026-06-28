import { ButtonStyle, MessageFlags } from "discord.js";

import config from "../../bot.config.js";
import { CreateEmbed } from "../../utils/message.js";

const pingRefreshButtonId = "ping.refresh";

export const createPingResponse = (description: string, websocketLatency: number) => {
  return {
    components: [
      CreateEmbed({
        title: "Pong",
        description,
        footer: `WebSocket latency: ${websocketLatency}ms`,
        actionRow: [
          {
            id: pingRefreshButtonId,
            label: "Refresh",
            style: ButtonStyle.Secondary,
          },
        ],
      }),
    ],
    flags: [MessageFlags.IsComponentsV2] as const,
  };
};

export default config.defineButton({
  id: pingRefreshButtonId,

  async execute(interaction) {
    const startedAt = Date.now();

    await interaction.deferUpdate();

    const latency = Date.now() - startedAt;

    await interaction.editReply(
      createPingResponse(`Discord API latency: **${latency}ms**`, interaction.client.ws.ping),
    );
  },
});
