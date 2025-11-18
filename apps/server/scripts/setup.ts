"use strict";

import fs from "fs/promises";
import { existsSync } from "fs";
import { buildItemsInfo } from "./item-info/build";
import { Database, dbDir, dbPath } from "@growserver/db";

async function setup() {
  const isEnv = existsSync("./.env");
  if (!isEnv) {
    await fs.copyFile("./.env.schema", "./.env")
  }

  const isData = existsSync(dbDir);
  if (!isData) {
    await fs.mkdir(dbDir);
    await fs.writeFile(dbPath, Buffer.alloc(0));
  }
  
  const db = new Database();
  await db.setup();
  await buildItemsInfo();
}

(async() => {
  await setup();
})();