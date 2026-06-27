import type { ServiceMap } from "./types.js";

export class ServiceRegistry {
  private services = new Map<keyof ServiceMap, ServiceMap[keyof ServiceMap]>();
  private listeners = new Map<keyof ServiceMap, Array<(service: ServiceMap[keyof ServiceMap]) => void>>();

  register<K extends keyof ServiceMap>(name: K, service: ServiceMap[K]) {
    this.services.set(name, service);

    for (const listener of this.listeners.get(name) ?? []) {
      listener(service);
    }
  }

  get<K extends keyof ServiceMap>(name: K) {
    return this.services.get(name) as ServiceMap[K] | undefined;
  }

  require<K extends keyof ServiceMap>(name: K) {
    const service = this.get(name);

    if (!service) {
      throw new Error(`Missing required service: ${name}`);
    }

    return service;
  }

  on<K extends keyof ServiceMap>(name: K, listener: (service: ServiceMap[K]) => void) {
    const existingService = this.get(name);

    if (existingService) {
      listener(existingService);
      return;
    }

    const listeners = this.listeners.get(name) ?? [];
    listeners.push(listener as (service: ServiceMap[keyof ServiceMap]) => void);
    this.listeners.set(name, listeners);
  }

  keys() {
    return [...this.services.keys()];
  }
}

