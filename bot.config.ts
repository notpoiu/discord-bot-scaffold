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

