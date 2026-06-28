import { database } from "./addons/database.js";
import { http } from "./addons/http.js";
import { defineConfig } from "./config.js";

const config = defineConfig({
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

export default config;
