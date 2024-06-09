import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig, searchForWorkspaceRoot } from "vite";
import { join } from "path";

export default defineConfig({
  plugins: [sveltekit()],
  server: {
    fs: {
      allow: [searchForWorkspaceRoot(process.cwd()), join(__dirname, "node_modules")]
    }
  }
});
