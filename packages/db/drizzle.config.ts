import { defineConfig } from "drizzle-kit";
import { normalizedPath } from ".";

export default defineConfig({
  dialect:       "sqlite",
  schema:        ["./shared/schemas/index.ts"],
  out:           "./drizzle",
  dbCredentials: {
    url: normalizedPath
  },
  strict:  false,
  verbose: false
});
