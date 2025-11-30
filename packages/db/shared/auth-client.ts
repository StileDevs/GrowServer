import { createAuthClient } from "better-auth/react";
import { config } from "@growserver/config";


export const authClient = createAuthClient({
  /** The base URL of the server (optional if you're using the same domain) */
  baseURL: `https://${config.web.loginUrl}`
});