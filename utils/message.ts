import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

type LinkButton = {
  label: string;
  url: string;
};

type EmbedOptions = {
  title: string;
  description: string;
  footer?: string;
  actionRow?: LinkButton[];
};

export const createText = (content: string) => {
  return new TextDisplayBuilder().setContent(content);
};

export const createEmbed = ({ title, description, footer, actionRow }: EmbedOptions) => {
  const container = new ContainerBuilder()
    .addTextDisplayComponents(createText(`## ${title}`))
    .addSeparatorComponents(new SeparatorBuilder())
    .addTextDisplayComponents(createText(description));

  if (footer) {
    container.addTextDisplayComponents(createText(`-# ${footer}`));
  }

  if (actionRow?.length) {
    const buttons = actionRow.map((button) => {
      return new ButtonBuilder()
        .setLabel(button.label)
        .setStyle(ButtonStyle.Link)
        .setURL(button.url);
    });

    container
      .addSeparatorComponents(new SeparatorBuilder())
      .addActionRowComponents(new ActionRowBuilder<ButtonBuilder>().addComponents(...buttons));
  }

  return container;
};

export const CreateText = createText;
export const CreateEmbed = createEmbed;

