import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

import type { CustomIdParams } from "../types.js";
import { createButton, type CreateButtonOptions } from "./interactions.js";

type LinkButton = {
  label: string;
  url: string;
};

type CustomButton = CreateButtonOptions & {
  id: string;
  params?: CustomIdParams;
};

type EmbedButton = LinkButton | CustomButton | ButtonBuilder;

type EmbedOptions = {
  title: string;
  description: string;
  footer?: string;
  actionRow?: EmbedButton[];
};

export const createText = (content: string) => {
  return new TextDisplayBuilder().setContent(content);
};

export const createEmbed = ({
  title,
  description,
  footer,
  actionRow,
}: EmbedOptions) => {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(createText(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(createText(description));

  if (footer) {
    container.addTextDisplayComponents(createText(`-# ${footer}`));
  }

  if (actionRow?.length) {
    const buttons = actionRow.map((button) => {
      if (button instanceof ButtonBuilder) {
        return button;
      }

      if ("url" in button) {
        return new ButtonBuilder()
          .setLabel(button.label)
          .setStyle(ButtonStyle.Link)
          .setURL(button.url);
      }

      return createButton(button.id, button, button.params);
    });

    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(
        new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons),
      );
  }

  return container;
};

export const CreateText = createText;
export const CreateEmbed = createEmbed;
