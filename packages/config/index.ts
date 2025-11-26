import { readFileSync } from "fs";
import { join } from "path";
import { parse } from "smol-toml";

export interface WebConfig {
  development: boolean;
  address: string;
  port: number;
  ports: number[];
  loginUrl: string;
  cdnUrl: string;
  maintenance: {
    enable: boolean;
    message: string;
  };
  tls: {
    key: string;
    cert: string;
  };
}

export interface WebFrontendConfig {
  root: string;
  port: number;
  tls: {
    key: string;
    cert: string;
  };
}

export interface ServerConfig {
  bypassVersionCheck: boolean;
  logLevel: string;
}

export interface Config {
  web: WebConfig;
  webFrontend: WebFrontendConfig;
  server: ServerConfig;
}

const configPath = join(__dirname, "config.toml");
const configContent = readFileSync(configPath, "utf-8");
const config = parse(configContent) as unknown as Config;
const frontend = () => {
  return {
    tls: {
      key: readFileSync(config.webFrontend.tls.key),
      cert: readFileSync(config.webFrontend.tls.cert),
    },
  };
};
const logon = () => {
  return {
    tls: {
      key: readFileSync(config.web.tls.key),
      cert: readFileSync(config.web.tls.cert),
    },
  };
};

export { config, frontend, logon };
