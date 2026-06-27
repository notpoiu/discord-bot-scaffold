# Discord Bot Scaffold

Barebones Discord bot scaffold with slash-command loading, command synchronization, a tiny logger, and a Components v2 message helper.

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

## Commands

- `/ping` replies with a Components v2 container showing API and websocket latency.

Add more commands under `commands/<category>/<command>.js`. Each command should export an object with `data` and `execute`.

