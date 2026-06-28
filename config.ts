import type { AccessCheck, AccessDeniedResponse, Addon, BotCommand, ButtonHandler, ModalHandler } from "./types.js";

export type AccessConfig = Record<string, AccessCheck>;

export type BotConfig<TAccess extends AccessConfig = AccessConfig> = {
  addons?: Addon[];
  access?: TAccess;
  accessDeniedResponse?: AccessDeniedResponse<Extract<keyof TAccess, string>>;
};

export type DefinedBotConfig<TAccess extends AccessConfig = AccessConfig> = {
  addons: Addon[];
  access: TAccess;
  accessDeniedResponse: AccessDeniedResponse<string>;
  defineCommand: <const TCommand extends BotCommand<Extract<keyof TAccess, string>>>(command: TCommand) => TCommand;
  defineButton: <const THandler extends ButtonHandler<Extract<keyof TAccess, string>>>(handler: THandler) => THandler;
  defineModal: <const THandler extends ModalHandler<Extract<keyof TAccess, string>>>(handler: THandler) => THandler;
};

export type AccessKeys<TConfig extends { access: AccessConfig }> = Extract<keyof TConfig["access"], string>;

export const defineConfig = <const TAccess extends AccessConfig = {}>(config: BotConfig<TAccess>) => {
  const defineCommand = <const TCommand extends BotCommand<Extract<keyof TAccess, string>>>(command: TCommand) => command;
  const defineButton = <const THandler extends ButtonHandler<Extract<keyof TAccess, string>>>(handler: THandler) => handler;
  const defineModal = <const THandler extends ModalHandler<Extract<keyof TAccess, string>>>(handler: THandler) => handler;

  return {
    addons: config.addons ?? [],
    access: (config.access ?? {}) as TAccess,
    accessDeniedResponse: (config.accessDeniedResponse ?? "You are not allowed to use this.") as AccessDeniedResponse<string>,
    defineCommand,
    defineButton,
    defineModal,
  } satisfies DefinedBotConfig<TAccess>;
};
