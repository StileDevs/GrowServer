"use strict";

import mongoose from "mongoose";
import { config } from "dotenv";
import { PlayerModel, UserModel, WorldModel } from "../shared/schemas/schema";
import { Database } from "../Database";

config({
  path: "../../.env",
});

export async function setupSeeds() {
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
      console.log("Connected to MongoDB");
    }

    // Clear existing data (optional - be careful in production!)
    await PlayerModel.deleteMany({});
    await UserModel.deleteMany({});
    await WorldModel.deleteMany({});
    console.log("Cleared existing data");

    const db = new Database();

     await db.player.register({
      username: "admin",
      displayName: "admin",
      email: "admin@growserver.dev",
      password: "admin",
      role: "admin",
      emailVerified: true,
      inventoryMax: 32,
    });

    await db.player.register({
      username: "reimu",
      displayName: "Reimu",
      email: "reimu@hakurei.shrine",
      password: "hakurei",
      role: "user",
      emailVerified: true,
      inventoryMax: 16,
    });

    await db.player.register({
      username: "jadlionhd",
      displayName: "JadlionHD",
      email: "jadlionhd@growserver.dev",
      password: "admin",
      role: "admin",
      emailVerified: true,
      inventoryMax: 32,
    });



    console.log("Seeding completed successfully!");
  } catch (error) {
    console.error("Error seeding database:", error);
    throw error;
  }
}
