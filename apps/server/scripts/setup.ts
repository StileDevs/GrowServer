"use strict";

import fs from "fs/promises";
import { existsSync } from "fs";
import { buildItemsInfo } from "./item-info/build";
import { Database, dbDir, dbPath } from "@growserver/db";

async function setup() {
  const isData = existsSync(dbDir);
  if (!isData) {
    await fs.mkdir(dbDir);
    await fs.writeFile(dbPath, Buffer.alloc(0));
  }

  const db = new Database();
  await db.setup();
  await buildItemsInfo();
  process.exit(0);
}

(async () => {
  await setup();
})();
