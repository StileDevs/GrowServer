import { defineConfig, type Options } from "tsup";

let config: Options = {
  entry: ["src/**/*"],
  outDir: "dist",
  splitting: true,
  sourcemap: false,
  bundle: true,
  clean: true,
  dts: false,
  target: "es2022",
  format: "cjs",
  loader: {
    ".key": "copy",
    ".crt": "copy",
    ".pem": "copy",
    ".rttex": "copy",
    ".json": "copy",
    ".html": "copy",
    ".css": "copy",
    ".js": "copy",
    ".svg": "copy",
    ".png": "copy",
    ".jpg": "copy",
    ".jpeg": "copy"
  }
};

export default defineConfig(config);
