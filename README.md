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

## Command Middleware

Create `middleware.ts` files inside `commands/` to run checks before matching commands execute.

Middleware priority follows the command folder depth:

- `commands/middleware.ts` runs before every command.
- `commands/admin/middleware.ts` runs before commands inside `commands/admin/`.
- `commands/admin/users/middleware.ts` runs after both of the above for commands inside `commands/admin/users/`.

```ts
import { MessageFlags } from "discord.js";

import type { CommandMiddleware } from "../types.js";

const middleware: CommandMiddleware = async (interaction, app) => {
  if (!interaction.inGuild()) {
    await interaction.reply({
      content: "Commands can only be used in a server.",
      flags: MessageFlags.Ephemeral,
    });

    return false;
  }

  app.logger.info(`/${interaction.commandName} used by ${interaction.user.tag}`);
};

export default middleware;
```

Return `false` to stop the command; return nothing to continue.

## Buttons and Modals

Put button and modal submit logic in `interactions/`:

- `interactions/buttons/<name>.ts`
- `interactions/modals/<name>.ts`

Handlers are loaded by ID from their exported object:

```ts
import { defineButton } from "../../utils/interactions.js";

export default defineButton({
  id: "ticket.close",

  async execute(interaction, app, params) {
    await interaction.reply({
      content: `Closing ticket ${params.ticketId}`,
      ephemeral: true,
    });
  },
});
```

Create matching custom IDs with the shared helpers:

```ts
import { ButtonStyle } from "discord.js";

import { createButton, createModalId } from "./utils/interactions.js";

const closeButton = createButton(
  "ticket.close",
  { label: "Close", style: ButtonStyle.Danger },
  { ticketId: "123" },
);

const modalId = createModalId("feedback.submit", { source: "ping" });
```

Custom IDs use `id?key=value` internally, like `ticket.close?ticketId=123`, and are capped at Discord's 100 character custom ID limit.

Modal files follow the same shape:

```ts
import { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } from "discord.js";

import { createModalId, defineModal } from "../../utils/interactions.js";

export const createFeedbackModal = () => {
  const input = new TextInputBuilder()
    .setCustomId("message")
    .setLabel("Message")
    .setStyle(TextInputStyle.Paragraph);

  return new ModalBuilder()
    .setCustomId(createModalId("feedback.submit"))
    .setTitle("Feedback")
    .addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
};

export default defineModal({
  id: "feedback.submit",

  async submit(interaction) {
    const message = interaction.fields.getTextInputValue("message");
    await interaction.reply({ content: `Received: ${message}`, ephemeral: true });
  },
});
```

The included `/ping` command uses `interactions/buttons/ping-refresh.ts` as a small button example.

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
      schema: import("./schema.js"),
    }),
    http({
      port: 3000,
    }),
  ],
});
```

Included addons:

- `http` starts a tiny Node HTTP server with `/` and `/health`.
- `database` opens a SQLite database with `better-sqlite3`, runs schema migrations, and registers `app.services.get("db")`.

Database schemas live in a normal TypeScript file:

```ts
import { defineDatabaseSchema } from "./addons/database.js";

export default defineDatabaseSchema({
  migrations: [
    {
      id: "001_create_key_value_table",
      up(db) {
        db.exec(`
          CREATE TABLE IF NOT EXISTS key_value (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
          );
        `);
      },
    },
  ],
});
```

Use `schema: import("./schema.js")` in `bot.config.ts`. Even though the source file is `schema.ts`, the `.js` specifier is the Node ESM pattern TypeScript emits for production builds.

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
