import { ButtonStyle, MessageFlags } from "discord.js";

import { defineButton } from "../../utils/interactions.js";
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

export default defineButton({
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
