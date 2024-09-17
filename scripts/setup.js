"use strict";

import fs from "fs";
import { downloadWebsiteBuild } from "./utils.js";

function init() {
  setupEnv();
  downloadWebsiteBuild();
}

function setupEnv() {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }

  if (!fs.existsSync("./.env")) {
    fs.writeFileSync("./.env", "ENCRYPT_SECRET=SUPERSECRET # Default encrypt secret\nDISCORD_BOT_TOKEN=Tokxxxxxxxen");
  }
}

init();
