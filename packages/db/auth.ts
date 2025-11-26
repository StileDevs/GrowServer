import { betterAuth, type BetterAuthOptions } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { drizzle } from "drizzle-orm/postgres-js";
import { username, admin as adminPlugin, captcha, emailOTP } from "better-auth/plugins";
import postgres from "postgres";
import * as schema from "./shared/schemas"

const tables = schema;

export const authConfig: BetterAuthOptions = {
  emailAndPassword: { 
    enabled:    true,
    autoSignIn: false
  },
  
  plugins: [
    username(),
    adminPlugin(),
    emailOTP({
      async sendVerificationOTP({ email, otp, type }) {
        // Implement the sendVerificationOTP method to send the OTP to the user's email address
      }
    }),
    captcha({
      provider:  "cloudflare-turnstile", // or google-recaptcha, hcaptcha
      secretKey: process.env.CLOUDFLARE_SECRET_KEY || "1x0000000000000000000000000000000AA"
    })
  ],

  // socialProviders: { 
  //   github: { 
  //     clientId:     process.env.GITHUB_CLIENT_ID as string, 
  //     clientSecret: process.env.GITHUB_CLIENT_SECRET as string, 
  //   }, 
  // }, 

  session: {
    expiresIn: 60 * 60 * 24 * 7, // Expires in 7 days
    updateAge: 60 * 60 * 24 // 1 day (every 1 day the session expiration is updated)
    // cookieCache: {
    //   enabled: true,
    //   maxAge: 5 * 60, // cache duration in seconds
    // },
  },
  // trustedOrigins: ["http://localhost:3000"]
  // user: {
  //   additionalFields: {
  //     playerId: {
  //       type: "number",
  //       required: false,
  //       input: false
  //     },
  //     role: {
  //       type: "string",
  //       required: false,
  //       input: false,
  //       defaultValue: "2"
  //     }
  //   }
  // }
}


// NOTE: this is used for generating schema, only used once just ignore it :D
export const auth = betterAuth(Object.assign({
  database: drizzleAdapter(drizzle({ client: postgres(process.env.DATABASE_URL!) }), {
    provider: "pg",
    schema:   {
      ...tables
    }
  }),
}, authConfig));


