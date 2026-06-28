import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

import { ButtonBuilder, ButtonStyle, Collection } from "discord.js";

import Logger from "../logger.js";
import type { ButtonHandler, CustomIdParams, ModalHandler, ParsedCustomId } from "../types.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const interactionsRoot = path.join(__dirname, "..", "interactions");
const interactionExtensions = new Set([".js", ".ts"]);
const maxCustomIdLength = 100;

export type CreateButtonOptions = {
  label: string;
  style?: Exclude<ButtonStyle, ButtonStyle.Link>;
  disabled?: boolean;
  emoji?: string;
};

type InteractionModule = {
  default?: unknown;
  button?: unknown;
  modal?: unknown;
};

const importFresh = async (filePath: string) => {
  const url = pathToFileURL(filePath);
  url.searchParams.set("updated", Date.now().toString());

  return import(url.href) as Promise<InteractionModule>;
};

const getErrorMessage = (error: unknown) => {
  return error instanceof Error ? error.message : String(error);
};

const validateCustomIdBase = (id: string) => {
  if (!id.trim()) {
    throw new Error("Custom IDs must be non-empty strings.");
  }

  if (id.includes("?")) {
    throw new Error(`Custom ID bases cannot include "?": ${id}`);
  }
};

export const createCustomId = (id: string, params: CustomIdParams = {}) => {
  validateCustomIdBase(id);

  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    searchParams.set(key, String(value));
  }

  const query = searchParams.toString();
  const customId = query ? `${id}?${query}` : id;

  if (customId.length > maxCustomIdLength) {
    throw new Error(`Custom ID "${id}" is ${customId.length} characters; Discord allows ${maxCustomIdLength}.`);
  }

  return customId;
};

export const createModalId = createCustomId;

export const parseCustomId = (customId: string): ParsedCustomId => {
  const separatorIndex = customId.indexOf("?");
  const id = separatorIndex === -1 ? customId : customId.slice(0, separatorIndex);
  const query = separatorIndex === -1 ? "" : customId.slice(separatorIndex + 1);
  const params = Object.fromEntries(new URLSearchParams(query));

  return {
    customId,
    id,
    params,
  };
};

export const createButton = (id: string, options: CreateButtonOptions, params?: CustomIdParams) => {
  const button = new ButtonBuilder()
    .setCustomId(createCustomId(id, params))
    .setLabel(options.label)
    .setStyle(options.style ?? ButtonStyle.Secondary);

  if (options.disabled !== undefined) {
    button.setDisabled(options.disabled);
  }

  if (options.emoji) {
    button.setEmoji(options.emoji);
  }

  return button;
};

export const defineButton = (handler: ButtonHandler) => {
  validateCustomIdBase(handler.id);
  return handler;
};

export const defineModal = (handler: ModalHandler) => {
  validateCustomIdBase(handler.id);
  return handler;
};

const isInteractionFile = (filePath: string) => {
  return interactionExtensions.has(path.extname(filePath)) && !filePath.endsWith(".d.ts");
};

const getInteractionFiles = (directory: string): string[] => {
  if (!fs.existsSync(directory)) {
    return [];
  }

  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((entry) => {
      const entryPath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        return getInteractionFiles(entryPath);
      }

      if (entry.isFile() && isInteractionFile(entryPath)) {
        return [entryPath];
      }

      return [];
    })
    .sort();
};

const isButtonHandler = (handler: unknown): handler is ButtonHandler<string> => {
  if (!handler || typeof handler !== "object") {
    return false;
  }

  const maybeHandler = handler as Partial<ButtonHandler>;

  return typeof maybeHandler.id === "string" && typeof maybeHandler.execute === "function";
};

const isModalHandler = (handler: unknown): handler is ModalHandler<string> => {
  if (!handler || typeof handler !== "object") {
    return false;
  }

  const maybeHandler = handler as Partial<ModalHandler>;

  return typeof maybeHandler.id === "string" && typeof maybeHandler.submit === "function";
};

const registerButtonHandler = (
  buttons: Collection<string, ButtonHandler<string>>,
  handler: ButtonHandler<string>,
  filePath: string,
) => {
  if (buttons.has(handler.id)) {
    Logger.warn(`Duplicate button handler id "${handler.id}" found at ${filePath}; keeping the first one.`);
    return;
  }

  buttons.set(handler.id, handler);
};

const registerModalHandler = (
  modals: Collection<string, ModalHandler<string>>,
  handler: ModalHandler<string>,
  filePath: string,
) => {
  if (modals.has(handler.id)) {
    Logger.warn(`Duplicate modal handler id "${handler.id}" found at ${filePath}; keeping the first one.`);
    return;
  }

  modals.set(handler.id, handler);
};

const loadButtonHandlers = async () => {
  const buttons = new Collection<string, ButtonHandler<string>>();
  const directory = path.join(interactionsRoot, "buttons");

  for (const filePath of getInteractionFiles(directory)) {
    try {
      const output = await importFresh(filePath);
      const handler = output.default ?? output.button ?? output;

      if (isButtonHandler(handler)) {
        registerButtonHandler(buttons, handler, filePath);
        continue;
      }

      Logger.warn(`The button handler at ${filePath} is missing a required "id" or "execute" property.`);
    } catch (error) {
      Logger.error(`Failed to import button handler from ${filePath}: ${getErrorMessage(error)}`);
    }
  }

  return buttons;
};

const loadModalHandlers = async () => {
  const modals = new Collection<string, ModalHandler<string>>();
  const directory = path.join(interactionsRoot, "modals");

  for (const filePath of getInteractionFiles(directory)) {
    try {
      const output = await importFresh(filePath);
      const handler = output.default ?? output.modal ?? output;

      if (isModalHandler(handler)) {
        registerModalHandler(modals, handler, filePath);
        continue;
      }

      Logger.warn(`The modal handler at ${filePath} is missing a required "id" or "submit" property.`);
    } catch (error) {
      Logger.error(`Failed to import modal handler from ${filePath}: ${getErrorMessage(error)}`);
    }
  }

  return modals;
};

export const loadInteractionHandlers = async () => {
  const [buttons, modals] = await Promise.all([loadButtonHandlers(), loadModalHandlers()]);

  return {
    buttons,
    modals,
  };
};
