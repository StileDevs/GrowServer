"use strict";

import fs from "fs";
import { downloadMkcert, setupMkcert } from "./utils";


async function setup() {
  await downloadMkcert();
  await setupMkcert();
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }
  if (!fs.existsSync("./.env")) {
    fs.copyFileSync("./.env.schema", "./.env")
  }

}
  

(async() => {
  await setup();
})();