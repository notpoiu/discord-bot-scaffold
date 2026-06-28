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

