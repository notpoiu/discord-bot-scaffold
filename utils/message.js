import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  SeparatorBuilder,
  TextDisplayBuilder,
} from "discord.js";

export const createText = (content) => {
  return new TextDisplayBuilder().setContent(content);
};

export const createEmbed = ({ title, description, footer, actionRow }) => {
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
      .addActionRowComponents(new ActionRowBuilder().addComponents(...buttons));
  }

  return container;
};

export const CreateText = createText;
export const CreateEmbed = createEmbed;

