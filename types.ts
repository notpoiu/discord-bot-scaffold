import type {
  AutocompleteInteraction,
  ButtonInteraction,
  ChatInputCommandInteraction,
  Client,
  Collection,
  InteractionReplyOptions,
  ModalSubmitInteraction,
} from "discord.js";
import type { IncomingMessage, Server, ServerResponse } from "http";

import type { BotConfig } from "./config.js";
import type { env } from "./env.js";
import type Logger from "./logger.js";
import type { ServiceRegistry } from "./services.js";

export type Env = typeof env;

export type MaybePromise<T> = T | Promise<T>;

export type CommandData = {
  name: string;
  toJSON: () => unknown;
};

export type BotCommand<TAccess extends string = never> = {
  data: CommandData;
  access?: AccessName<TAccess>;
  execute: (interaction: ChatInputCommandInteraction, context: AppContext) => MaybePromise<void>;
  autocomplete?: (interaction: AutocompleteInteraction, context: AppContext) => MaybePromise<void>;
  middleware?: CommandMiddleware[];
};

export type CommandMiddleware = (
  interaction: ChatInputCommandInteraction,
  context: AppContext,
) => MaybePromise<boolean | void>;

export type CustomIdParams = Record<string, string | number | boolean | null | undefined>;

export type ParsedCustomId = {
  customId: string;
  id: string;
  params: Record<string, string>;
};

export type ButtonHandler<TAccess extends string = never> = {
  id: string;
  access?: AccessName<TAccess>;
  execute: (
    interaction: ButtonInteraction,
    context: AppContext,
    params: ParsedCustomId["params"],
  ) => MaybePromise<void>;
};

export type ModalHandler<TAccess extends string = never> = {
  id: string;
  access?: AccessName<TAccess>;
  submit: (
    interaction: ModalSubmitInteraction,
    context: AppContext,
    params: ParsedCustomId["params"],
  ) => MaybePromise<void>;
};

export type AccessName<TAccess extends string = never> = "author" | "everyone" | TAccess;

export type AccessInteraction = ChatInputCommandInteraction | ButtonInteraction | ModalSubmitInteraction;

export type AccessCheck = (
  discordId: string,
  context: AppContext,
  interaction: AccessInteraction,
) => MaybePromise<boolean>;

export type AccessDeniedContext<TAccess extends string = string> = {
  access: AccessName<TAccess>;
  context: AppContext;
  interaction: AccessInteraction;
};

export type AccessDeniedResponse<TAccess extends string = string> =
  | string
  | InteractionReplyOptions
  | ((details: AccessDeniedContext<TAccess>) => MaybePromise<string | InteractionReplyOptions>);

export type Addon = {
  name: string;
  setup?: (context: AppContext) => MaybePromise<void>;
  start?: (context: AppContext) => MaybePromise<void>;
  stop?: (context: AppContext) => MaybePromise<void>;
};

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type HttpRequestContext = {
  app: AppContext;
  request: IncomingMessage;
  response: ServerResponse;
  url: URL;
};

export type HttpHandler = (context: HttpRequestContext) => MaybePromise<unknown>;

export type HttpService = {
  port: number;
  server: Server;
  route: (method: HttpMethod, pathname: string, handler: HttpHandler) => void;
  get: (pathname: string, handler: HttpHandler) => void;
  post: (pathname: string, handler: HttpHandler) => void;
};

export type DatabaseStatement = {
  get: (...params: unknown[]) => unknown;
  all: (...params: unknown[]) => unknown[];
  run: (...params: unknown[]) => unknown;
};

export type DatabaseService = {
  path: string;
  exec: (sql: string) => void;
  prepare: (sql: string) => DatabaseStatement;
  close: () => void;
};

export type ServiceMap = {
  http: HttpService;
  db: DatabaseService;
};

export type AppContext = {
  env: Env;
  config: Required<BotConfig<any>>;
  logger: typeof Logger;
  client: Client;
  commands: Collection<string, BotCommand<string>>;
  buttons: Collection<string, ButtonHandler<string>>;
  modals: Collection<string, ModalHandler<string>>;
  services: ServiceRegistry;
  addons: string[];
  startedAt: number;
};
