import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  root: "./website",
  build: {
    outDir: "../build",
    emptyOutDir: true
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "./website/src")
    }
  }
});
