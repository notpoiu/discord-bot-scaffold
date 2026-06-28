import fs from "fs";
import nodePath from "path";

import Database from "better-sqlite3";

import type { Addon, DatabaseService, DatabaseStatement } from "../types.js";

const migrationsTable = "__bot_migrations";

export type DatabaseMigration = {
  id: string;
  up: (db: DatabaseService) => void;
};

export type DatabaseSchema = {
  migrations?: DatabaseMigration[];
};

type DatabaseSchemaModule =
  | DatabaseSchema
  | { default: DatabaseSchema }
  | { schema: DatabaseSchema };

type DatabaseAddonOptions = {
  path?: string;
  schema?: DatabaseSchemaModule | Promise<DatabaseSchemaModule>;
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

export const defineDatabaseSchema = (schema: DatabaseSchema) => {
  return schema;
};

const getSchemaFromModule = (schemaModule: DatabaseSchemaModule) => {
  if ("default" in schemaModule) {
    return schemaModule.default;
  }

  if ("schema" in schemaModule) {
    return schemaModule.schema;
  }

  return schemaModule;
};

const getAppliedMigrationIds = (db: DatabaseService) => {
  db.exec(`
    CREATE TABLE IF NOT EXISTS ${migrationsTable} (
      id TEXT PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const rows = db.prepare(`SELECT id FROM ${migrationsTable}`).all() as Array<{
    id: string;
  }>;
  return new Set(rows.map((row) => row.id));
};

const validateMigrations = (migrations: DatabaseMigration[]) => {
  const migrationIds = new Set<string>();

  for (const migration of migrations) {
    if (!migration.id || typeof migration.id !== "string") {
      throw new Error("Database migrations must have a non-empty string id.");
    }

    if (migrationIds.has(migration.id)) {
      throw new Error(`Duplicate database migration id: ${migration.id}`);
    }

    migrationIds.add(migration.id);
  }
};

const runPendingMigrations = (
  db: DatabaseService,
  migrations: DatabaseMigration[],
) => {
  validateMigrations(migrations);

  const appliedMigrationIds = getAppliedMigrationIds(db);
  const insertMigration = db.prepare(
    `INSERT INTO ${migrationsTable} (id, applied_at) VALUES (?, ?)`,
  );
  let appliedCount = 0;

  for (const migration of migrations) {
    if (appliedMigrationIds.has(migration.id)) {
      continue;
    }

    db.exec("BEGIN IMMEDIATE;");

    try {
      migration.up(db);
      insertMigration.run(migration.id, new Date().toISOString());
      db.exec("COMMIT;");
      appliedCount += 1;
    } catch (error) {
      db.exec("ROLLBACK;");
      throw error;
    }
  }

  return appliedCount;
};

export const database = (options: DatabaseAddonOptions = {}): Addon => {
  const databasePath = options.path ?? "data/app.sqlite";

  return {
    name: "database",

    async setup(context) {
      const db = createDatabase(databasePath);

      try {
        const schema = options.schema
          ? getSchemaFromModule(await options.schema)
          : undefined;

        if (schema?.migrations?.length) {
          const appliedCount = runPendingMigrations(db, schema.migrations);

          if (appliedCount > 0) {
            context.logger.success(
              `Applied ${appliedCount} database migration(s) for ${databasePath}`,
            );
          }
        }

        context.services.register("db", db);
      } catch (error) {
        db.close();
        throw error;
      }
    },

    stop(context) {
      context.services.get("db")?.close();
    },
  };
};

export default database;
