import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect: "sqlite",
  schema: "./src/database/schemas.ts",
  out: "./drizzle",
  dbCredentials: {
    url: "./data/dev.db"
  }
});
