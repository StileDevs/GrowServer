import path from "path";

export * from "./Database";
export * from "./shared";

export const dbDir: string = path.join(__dirname, "data");
export const dbPath: string = path.join(dbDir, "data.db");
export const normalizedPath = dbPath.replace(/\\/g, "/").replace(/^[A-Z]:/, "");
