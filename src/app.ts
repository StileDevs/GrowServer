import { execSync } from "child_process";
import consola from "consola";
import fs from "fs/promises";
import { Client } from "growtopia.js";

const client = new Client({
  enet: {
    ip: "0.0.0.0"
  }
});

const pluginDir = await fs.readdir("./plugins");

/** @type {Map<string, import("../src/app").Plugin>} */
const loadedPlugins = new Map();

client.on("ready", async () => {
  consola.box("GrowServer");
  consola.info(`[server] - Starting ENet server port: ${client.config.enet?.port}`);

  await loadPlugin();
  await checkDependencies();
  await addPluginApi();

  await new Promise((res, rej) => {});

  consola.success(`[server] - Loaded ${loadedPlugins.size} plugins`);
});

client.on("error", (err) => {
  consola.error("[server] - Something wrong with growserver", err);
});

client.on("connect", (netID) => loadedPlugins.forEach((v) => v.onConnect(netID)));

client.on("disconnect", (netID) => loadedPlugins.forEach((v) => v.onDisconnect(netID)));

client.on("raw", (netID, data) => loadedPlugins.forEach((v) => v.onRaw(netID, data)));

client.listen();

// Load every plugins that inside plugins directory
async function loadPlugin() {
  for (let i = 0; i < pluginDir.length; i++) {
    const dir = pluginDir[i];

    try {
      const { Plugin } = await import(`../plugins/${dir}/src/app.js`);
      /** @type {import("../src/app").Plugin} */
      const plugin = new Plugin(client);

      loadedPlugins.set(dir, plugin);
    } catch (e) {
      consola.error(`[server] - Oh no, something wrong when load plugin ${dir}`, e);
    }
  }
}
// Check dependencies
async function checkDependencies() {
  for (let i = 0; i < pluginDir.length; i++) {
    const dir = pluginDir[i];
    try {
      const pluginPackage = JSON.parse(await fs.readFile(`./plugins/${dir}/package.json`, "utf-8"));

      let packages = "";
      for (const [key, value] of Object.entries(pluginPackage.dependencies)) {
        packages += `${key} `;
      }
      consola.info(`[server] - Installing ${pluginPackage.name} packages: ${packages}`);
      execSync(`pnpm install ${packages}`);
    } catch (e) {
      consola.error(`Oh no, something wrong when load plugin ${pluginDir}`, e);
    }
  }
}

// Give API access for the Plugins
async function addPluginApi() {
  for (let plugin of loadedPlugins.entries()) {
    const p = plugin[1];
    if (!p.requiredPlugins.length) return;

    p.requiredPlugins.forEach((pluginName: string) => {
      if (p.pluginConf.name === pluginName) return;

      if (loadedPlugins.has(pluginName)) {
        p.setPlugin(pluginName, loadedPlugins.get(pluginName));
      }
    });
  }

  for (let plugin of loadedPlugins.entries()) {
    const p = plugin[1];
    try {
      consola.info(`[server] - Initialize ${p.pluginConf.name} v${p.pluginConf.version}`);
      await p.init();
      consola.ready(`[server] - Loaded ${p.pluginConf.name} v${p.pluginConf.version}`);
    } catch (e) {
      consola.error(`[server] - Oh no, something wrong when load plugin ${p.pluginConf.name}`, e);
    }
  }
}
