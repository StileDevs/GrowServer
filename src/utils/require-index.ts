import fs from "fs/promises";
import path from "path";
import { createRequire } from "module";

const requireSync =
  typeof require !== "undefined" ? require : createRequire(import.meta.url);

/**
 * Dynamically requires modules from a directory.
 *
 * @param dir - The directory to read from.
 * @param basenames - Optional array of explicit filenames to include.
 * @returns A promise resolving to a dictionary mapping basenames to their exported modules.
 */
export default async function requireIndex<T = unknown>(
  dir: string,
  basenames?: string[],
): Promise<Record<string, T>> {
  const requires: Record<string, T> = {};

  if (basenames !== undefined) {
    for (const basename of basenames) {
      const filepath = path.resolve(path.join(dir, basename));
      requires[basename] = requireSync(filepath);
    }
  } else {
    const files = await fs.readdir(dir);

    files.sort((a: string, b: string) => {
      const lowerA = a.toLowerCase();
      const lowerB = b.toLowerCase();

      if (lowerA < lowerB) return -1;
      if (lowerB < lowerA) return 1;
      return 0;
    });

    for (const filename of files) {
      if (
        filename === "index.js" ||
        filename === "index.ts" ||
        filename.startsWith("_") ||
        filename.startsWith(".")
      ) {
        continue;
      }

      const filepath = path.resolve(path.join(dir, filename));
      const ext = path.extname(filename);

      const stats = await fs.stat(filepath);

      if (stats.isFile() && ![".js", ".ts", ".node", ".json"].includes(ext)) {
        continue;
      }

      const basename = path.basename(filename, ext);

      // Note: We are still loading the module synchronously via require.
      // If you want full ES Modules, you could replace this with:
      // requires[basename] = await import(filepath);
      requires[basename] = requireSync(filepath);
    }
  }

  return requires;
}
