import Logger from "../logger.js";
import type { Addon, AppContext } from "../types.js";

export const setupAddons = async (context: AppContext, addons: Addon[]) => {
  for (const addon of addons) {
    await addon.setup?.(context);
    context.addons.push(addon.name);
    Logger.info(`Loaded addon: ${addon.name}`);
  }
};

export const startAddons = async (context: AppContext, addons: Addon[]) => {
  for (const addon of addons) {
    await addon.start?.(context);
  }
};

export const stopAddons = async (context: AppContext, addons: Addon[]) => {
  for (const addon of [...addons].reverse()) {
    await addon.stop?.(context);
  }
};
