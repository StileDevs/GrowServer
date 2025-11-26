"use strict";

import { buildItemsInfo } from "./item-info/build";
import { Database } from "@growserver/db";

async function setup() {
  const db = new Database();
  await db.setup();
  await buildItemsInfo();
  process.exit(0);
}

(async () => {
  await setup();
})();
