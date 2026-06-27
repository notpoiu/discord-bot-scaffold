# Discord Bot Scaffold

Barebones Discord bot scaffold with slash-command loading, command synchronization, a tiny logger, a Components v2 message helper, and an addon/service layer.

## Setup

1. Install dependencies:

```sh
npm install
```

2. Copy `.env.example` to `.env` and fill in:

```env
BOT_TOKEN=your bot token
CLIENT_ID=your application client id
GUILD_ID=optional guild id for fast development command sync
```

3. Start the bot:

```sh
npm run dev
```

Build the production JavaScript output:

```sh
npm run build
```

## Commands

- `/ping` replies with a Components v2 container showing API and websocket latency.

Add more commands under `commands/<category>/<command>.ts`. Each command should export an object with `data` and `execute`.

Commands receive the shared app context as their second argument:

```ts
async execute(interaction, app) {
  const db = app.services.get("db");
}
```

## Addons

Configure addons in `bot.config.ts`, similar to a `next.config.ts` file:

```ts
import { database } from "./addons/database.js";
import { http } from "./addons/http.js";
import { defineConfig } from "./config.js";

export default defineConfig({
  addons: [
    database({
      path: "data/app.sqlite",
    }),
    http({
      port: 3000,
    }),
  ],
});
```

Included addons:

- `http` starts a tiny Node HTTP server with `/` and `/health`.
- `database` opens a SQLite database with `better-sqlite3` and registers `app.services.get("db")`.

When both are enabled, the database addon also adds `/db/health` to the HTTP server. The service registry connects addons even if they load in either order:

```ts
context.services.on("http", (http) => {
  http.get("/example", () => ({ ok: true }));
});
```

Create new addon factories under `addons/<name>.ts`:

```ts
import type { Addon } from "../types.js";

type ExampleOptions = {
  message?: string;
};

export const example = (options: ExampleOptions = {}): Addon => {
  return {
    name: "example",
    setup(context) {
      context.logger.info(options.message ?? "Example addon loaded");
    },
  };
};
```
