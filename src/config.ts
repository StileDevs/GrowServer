export const Config = {
  debugMode: false,
  bypassVersionCheck: false,
  passwordEncryptionKey: process.env.ENCRYPT_SECRET || "SUPERSECRET",
  discord: {
    ownerId: "",
    clientId: "",
    clientToken: process.env.DISCORD_BOT_TOKEN || ""
  },
  webserver: {
    development: true,
    address: "127.0.0.1",
    ports: [17091],
    loginUrl: "login.growserver.app:8080",
    maintenance: {
      enable: false,
      message: "Maintenance Woi"
    }
  }
};
