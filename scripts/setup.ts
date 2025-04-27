"use strict";

import fs from "fs";
import { downloadMkcert, setupMkcert } from "./utils";


async function setup() {
  await downloadMkcert();
  await setupMkcert();
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }
}
  

(async() => {
  await setup();
})();