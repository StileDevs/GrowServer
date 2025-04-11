"use strict";

import fs from "fs";
import { downloadMkcert } from "./item-info/utils";

function init() {
  setup();
}

async function setup() {
  if (!fs.existsSync("./data")) {
    fs.mkdirSync("./data");
  }
  await downloadMkcert()
}
  
init();
