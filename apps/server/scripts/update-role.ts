// DISABLED FOR NOW

// import { drizzle } from "drizzle-orm/libsql";
// import { createClient } from "@libsql/client";
// import { players } from "../src/database/schemas/Player";
// import { eq } from "drizzle-orm";
// import consola from "consola";

// const username = process.argv[2];
// const roleValue = process.argv[3] || "1"; // Default to DEVELOPER

// if (!username) {
//   consola.error("Please provide a username");
//   consola.info("Usage: pnpm tsx scripts/update-role.ts <username> [role]");
//   consola.info("Roles: 1=DEVELOPER, 2=BASIC, 3=SUPPORTER");
//   process.exit(1);
// }

// async function updateRole() {
//   const sqlite = createClient({
//     url: `file:data/data.db`
//   });
//   const db = drizzle(sqlite, { logger: false });

//   try {
//     const result = await db
//       .update(players)
//       .set({ role: roleValue })
//       .where(eq(players.name, username));

//     consola.success(`Role updated to ${roleValue} for user: ${username}`);
//     process.exit(0);
//   } catch (error) {
//     consola.error("Failed to update role:", error);
//     process.exit(1);
//   }
// }

// updateRole();
