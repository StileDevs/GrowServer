import { defineConfig } from "drizzle-kit";

export default defineConfig({
  dialect:       "sqlite",
  schema:        ["./src/database/schemas/Player.ts", "./src/database/schemas/World.ts"],
  out:           "./drizzle",
  dbCredentials: {
    url: "./data/data.db"
  },
  strict:  false,
  verbose: false
});
