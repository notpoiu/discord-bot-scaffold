import fs from "fs";
import nodePath from "path";

import Database from "better-sqlite3";

import type { Addon, DatabaseService, DatabaseStatement } from "../types.js";

type DatabaseAddonOptions = {
  path?: string;
};

const createDatabase = (databasePath: string) => {
  fs.mkdirSync(nodePath.dirname(databasePath), { recursive: true });

  const connection = new Database(databasePath);
  connection.pragma("foreign_keys = ON");
  connection.pragma("journal_mode = WAL");

  return {
    path: databasePath,
    exec(sql: string) {
      connection.exec(sql);
    },
    prepare(sql: string) {
      return connection.prepare(sql) as unknown as DatabaseStatement;
    },
    close() {
      connection.close();
    },
  } satisfies DatabaseService;
};

export const database = (options: DatabaseAddonOptions = {}): Addon => {
  const databasePath = options.path ?? "data/app.sqlite";

  return {
    name: "database",

    setup(context) {
      const db = createDatabase(databasePath);
      context.services.register("db", db);

      context.services.on("http", (http) => {
        http.get("/db/health", () => {
          const result = db.prepare("SELECT 1 AS ok").get() as { ok?: number };

          return {
            ok: result.ok === 1,
            path: db.path,
          };
        });
      });
    },

    stop(context) {
      context.services.get("db")?.close();
    },
  };
};

export default database;
