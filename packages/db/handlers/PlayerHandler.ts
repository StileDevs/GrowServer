import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { PlayerModel, UserModel } from "../shared/schemas/schema";
import { type Db, type MongoClient } from "mongodb";

export class PlayerHandler {
  constructor(public connection: MongoClient, public db: Db) {}

  /**
   * Register a new player with both better-auth and GrowServer player data
   */
  public async register(options: {
    username: string;
    displayName: string;
    email: string;
    password: string;
    role?: "admin" | "user";
    emailVerified?: boolean;
    inventoryMax?: number;
  }) {
    const {
      username,
      displayName,
      email,
      password,
      role = "user",
      emailVerified = false,
      inventoryMax = 16,
    } = options;

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Check if user/player already exists
    const existingPlayer = await PlayerModel.findOne({ name: username.toLowerCase() });
    if (existingPlayer) {
      throw new Error(`Player with username "${username}" already exists`);
    }

    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      throw new Error(`User with email "${email}" already exists`);
    }

    // Create player first
    const player = await PlayerModel.create({
      name:        username.toLowerCase(),
      displayName: displayName,
      password:    hashedPassword,
      role:        role,
      clothing:    {
        shirt:    0,
        pants:    0,
        feet:     0,
        face:     0,
        hand:     0,
        back:     0,
        hair:     0,
        mask:     0,
        necklace: 0,
        ances:    0,
      },
      inventory: {
        max:   inventoryMax,
        items: [],
      },
    });

    // Create better-auth user
    const user = await UserModel.create({
      name:          displayName,
      email:         email,
      emailVerified: emailVerified,
      username:      username,
      role:          role,
      playerId:      player._id,
    });

    // Link user to player
    await PlayerModel.findByIdAndUpdate(player._id, { userId: user._id });

    return {
      user,
      player,
    };
  }

  /**
   * Login a player with username and password
   */
  public async login(username: string, password: string) {
    const player = await PlayerModel.findOne({ name: username.toLowerCase() });
    if (!player) {
      throw new Error("Invalid username or password");
    }

    const isPasswordValid = await bcrypt.compare(password, player.password);
    if (!isPasswordValid) {
      throw new Error("Invalid username or password");
    }

    // Get associated user
    const user = await UserModel.findById(player.userId);

    return {
      player,
      user,
    };
  }

  /**
   * Get a player by username
   */
  public async get(username: string) {
    const player = await PlayerModel.findOne({ name: username.toLowerCase() }).populate("userId");
    return player;
  }

  /**
   * Get a player by ID
   */
  public async getById(playerId: string) {
    const player = await PlayerModel.findById(playerId).populate("userId");
    return player;
  }

  /**
   * Check if a player exists
   */
  public async exists(username: string) {
    const player = await PlayerModel.findOne({ name: username.toLowerCase() });
    return !!player;
  }

  /**
   * Update player data
   */
  public async update(username: string, data: {
    displayName?: string;
    password?: string;
    role?: string;
    clothing?: {
      shirt?: number;
      pants?: number;
      feet?: number;
      face?: number;
      hand?: number;
      back?: number;
      hair?: number;
      mask?: number;
      necklace?: number;
      ances?: number;
    };
    inventory?: {
      max?: number;
      items?: Array<{ id: number; amount: number }>;
    };
  }) {
    const updateData: Record<string, unknown> = {};

    if (data.displayName) updateData.displayName = data.displayName;
    if (data.role) updateData.role = data.role;

    if (data.password) {
      const salt = await bcrypt.genSalt(10);
      updateData.password = await bcrypt.hash(data.password, salt);
    }

    if (data.clothing) {
      updateData.clothing = data.clothing;
    }

    if (data.inventory) {
      updateData.inventory = data.inventory;
    }

    const player = await PlayerModel.findOneAndUpdate(
      { name: username.toLowerCase() },
      updateData,
      { new: true }
    );

    if (!player) {
      throw new Error(`Player with username "${username}" not found`);
    }

    return player;
  }

  /**
   * Delete a player and associated user
   */
  public async delete(username: string) {
    const player = await PlayerModel.findOne({ name: username.toLowerCase() });
    if (!player) {
      throw new Error(`Player with username "${username}" not found`);
    }

    // Delete associated user
    if (player.userId) {
      await UserModel.findByIdAndDelete(player.userId);
    }

    // Delete player
    await PlayerModel.findByIdAndDelete(player._id);

    return true;
  }

  /**
   * Get all players
   */
  public async getAll(limit?: number, skip?: number) {
    let query = PlayerModel.find().populate("userId");

    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query.exec();
  }

  /**
   * Count total players
   */
  public async count() {
    return await PlayerModel.countDocuments();
  }

  /**
   * Add item to player inventory
   */
  public async addItem(username: string, itemId: number, amount: number) {
    const player = await PlayerModel.findOne({ name: username.toLowerCase() });
    if (!player) {
      throw new Error(`Player with username "${username}" not found`);
    }

    if (!player.inventory || !player.inventory.items) {
      throw new Error(`Player inventory not initialized`);
    }

    const existingItem = player.inventory.items.find((item) => item.id === itemId);
    if (existingItem) {
      existingItem.amount += amount;
    } else {
      player.inventory.items.push({ id: itemId, amount });
    }

    await player.save();
    return player;
  }

  /**
   * Remove item from player inventory
   */
  public async removeItem(username: string, itemId: number, amount: number) {
    const player = await PlayerModel.findOne({ name: username.toLowerCase() });
    if (!player) {
      throw new Error(`Player with username "${username}" not found`);
    }

    if (!player.inventory || !player.inventory.items) {
      throw new Error(`Player inventory not initialized`);
    }

    const existingItem = player.inventory.items.find((item) => item.id === itemId);
    if (!existingItem) {
      throw new Error(`Item with id ${itemId} not found in inventory`);
    }

    existingItem.amount -= amount;
    if (existingItem.amount <= 0) {
      const itemIndex = player.inventory.items.findIndex((item) => item.id === itemId);
      if (itemIndex !== -1) {
        player.inventory.items.splice(itemIndex, 1);
      }
    }

    await player.save();
    return player;
  }

  /**
   * Update player clothing
   */
  public async updateClothing(username: string, clothing: {
    shirt?: number;
    pants?: number;
    feet?: number;
    face?: number;
    hand?: number;
    back?: number;
    hair?: number;
    mask?: number;
    necklace?: number;
    ances?: number;
  }) {
    const player = await PlayerModel.findOneAndUpdate(
      { name: username.toLowerCase() },
      { $set: { clothing } },
      { new: true }
    );

    if (!player) {
      throw new Error(`Player with username "${username}" not found`);
    }

    return player;
  }
}
