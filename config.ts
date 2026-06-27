import type { Addon } from "./types.js";

export type BotConfig = {
  addons?: Addon[];
};

export const defineConfig = (config: BotConfig) => {
  return {
    addons: config.addons ?? [],
  } satisfies Required<BotConfig>;
};

