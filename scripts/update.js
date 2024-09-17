import { downloadWebsiteBuild } from "./utils.js";

function init() {
  console.log("Updating website, please wait...");
  downloadWebsiteBuild();
}

init();
