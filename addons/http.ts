import { createServer } from "http";

import type { Addon, HttpHandler, HttpMethod, HttpService } from "../types.js";

type HttpAddonOptions = {
  port?: number;
};

const routeKey = (method: HttpMethod, pathname: string) => `${method}:${pathname}`;

const sendJson = (response: Parameters<HttpHandler>[0]["response"], statusCode: number, body: unknown) => {
  response.writeHead(statusCode, { "content-type": "application/json; charset=utf-8" });
  response.end(JSON.stringify(body));
};

export const http = (options: HttpAddonOptions = {}): Addon => {
  const port = options.port ?? 3000;

  return {
    name: "http",

    setup(context) {
      const routes = new Map<string, HttpHandler>();

      const service: HttpService = {
        port,
        server: createServer(async (request, response) => {
          const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`);
          const method = (request.method ?? "GET").toUpperCase() as HttpMethod;
          const handler = routes.get(routeKey(method, url.pathname));

          if (!handler) {
            sendJson(response, 404, { ok: false, error: "Not found" });
            return;
          }

          try {
            const body = await handler({ app: context, request, response, url });

            if (response.writableEnded) {
              return;
            }

            if (body === undefined) {
              response.writeHead(204);
              response.end();
              return;
            }

            sendJson(response, 200, body);
          } catch (error) {
            context.logger.error(error instanceof Error ? error.stack || error.message : String(error));
            sendJson(response, 500, { ok: false, error: "Internal server error" });
          }
        }),

        route(method, pathname, handler) {
          routes.set(routeKey(method, pathname), handler);
        },

        get(pathname, handler) {
          service.route("GET", pathname, handler);
        },

        post(pathname, handler) {
          service.route("POST", pathname, handler);
        },
      };

      service.get("/", ({ app }) => ({
        ok: true,
        name: "discord-bot-scaffold",
        uptime: Math.floor((Date.now() - app.startedAt) / 1000),
        addons: app.addons,
        services: app.services.keys(),
        bot: app.client.user?.tag ?? null,
      }));

      service.get("/health", ({ app }) => ({
        ok: true,
        uptime: Math.floor((Date.now() - app.startedAt) / 1000),
        services: app.services.keys(),
      }));

      context.services.register("http", service);
    },

    async start(context) {
      const httpService = context.services.require("http");

      await new Promise<void>((resolve) => {
        httpService.server.listen(httpService.port, resolve);
      });

      context.logger.success(`HTTP server listening on http://localhost:${httpService.port}`);
    },

    async stop(context) {
      const httpService = context.services.get("http");

      if (!httpService) {
        return;
      }

      await new Promise<void>((resolve, reject) => {
        httpService.server.close((error) => (error ? reject(error) : resolve()));
      });
    },
  };
};

export default http;
