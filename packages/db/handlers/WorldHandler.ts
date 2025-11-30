import mongoose from "mongoose";
import { WorldModel, PlayerModel } from "../shared/schemas/schema";
import { Types } from "mongoose";
import { type Db, type MongoClient } from "mongodb";


export class WorldHandler {
  constructor(public connection: MongoClient, public db: Db) {}

  /**
   * Create a new world
   */
  public async create(options: {
    name: string;
    width?: number;
    height?: number;
    ownerId?: string;
    tilesData?: Buffer;
    weather?: {
      id?: number;
      heatWave?: {
        r?: number;
        g?: number;
        b?: number;
      };
    };
  }) {
    const {
      name,
      width = 100,
      height = 60,
      ownerId,
      tilesData,
      weather,
    } = options;

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    // Check if world already exists
    const existingWorld = await WorldModel.findOne({ name: name.toUpperCase() });
    if (existingWorld) {
      throw new Error(`World with name "${name}" already exists`);
    }

    const world = await WorldModel.create({
      name:      name.toUpperCase(),
      width,
      height,
      owner:     ownerId ? { userId: new Types.ObjectId(ownerId) } : undefined,
      tilesData: tilesData || Buffer.alloc(width * height * 8),
      extras:    [],
      weather:   {
        id:       weather?.id || 41,
        heatWave: {
          r: weather?.heatWave?.r || 0,
          g: weather?.heatWave?.g || 0,
          b: weather?.heatWave?.b || 0,
        },
      },
    });

    return world;
  }

  /**
   * Get a world by name
   */
  public async get(name: string) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOne({ name: name.toUpperCase() }).populate("owner.userId");
    return world;
  }

  /**
   * Get a world by ID
   */
  public async getById(worldId: string) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findById(worldId).populate("owner.userId");
    return world;
  }

  /**
   * Check if a world exists
   */
  public async exists(name: string) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOne({ name: name.toUpperCase() });
    return !!world;
  }

  /**
   * Update world data
   */
  public async update(name: string, data: {
    width?: number;
    height?: number;
    ownerId?: string;
    worldLock?: {
      x: number;
      y: number;
    };
    tilesData?: Buffer;
    extras?: Array<{
      type: number;
      data: Record<string, unknown>;
    }>;
    weather?: {
      id?: number;
      heatWave?: {
        r?: number;
        g?: number;
        b?: number;
      };
    };
  }) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const updateData: Record<string, unknown> = {};

    if (data.width !== undefined) updateData.width = data.width;
    if (data.height !== undefined) updateData.height = data.height;
    if (data.tilesData !== undefined) updateData.tilesData = data.tilesData;
    if (data.extras !== undefined) updateData.extras = data.extras;

    if (data.ownerId !== undefined || data.worldLock !== undefined) {
      updateData.owner = {};
      if (data.ownerId) updateData["owner.userId"] = data.ownerId;
      if (data.worldLock) updateData["owner.worldLock"] = data.worldLock;
    }

    if (data.weather) {
      if (data.weather.id !== undefined) updateData["weather.id"] = data.weather.id;
      if (data.weather.heatWave) {
        if (data.weather.heatWave.r !== undefined) updateData["weather.heatWave.r"] = data.weather.heatWave.r;
        if (data.weather.heatWave.g !== undefined) updateData["weather.heatWave.g"] = data.weather.heatWave.g;
        if (data.weather.heatWave.b !== undefined) updateData["weather.heatWave.b"] = data.weather.heatWave.b;
      }
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      updateData,
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Delete a world
   */
  public async delete(name: string) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOneAndDelete({ name: name.toUpperCase() });
    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return true;
  }

  /**
   * Get all worlds
   */
  public async getAll(limit?: number, skip?: number) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    let query = WorldModel.find().populate("owner.userId");

    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query.exec();
  }

  /**
   * Count total worlds
   */
  public async count() {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    return await WorldModel.countDocuments();
  }

  /**
   * Get worlds owned by a player
   */
  public async getByOwner(playerId: string, limit?: number, skip?: number) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    let query = WorldModel.find({ "owner.userId": playerId }).populate("owner.userId");

    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query.exec();
  }

  /**
   * Set world owner
   */
  public async setOwner(name: string, playerId: string, worldLock?: { x: number; y: number }) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const updateData: Record<string, unknown> = {
      "owner.userId": playerId,
    };

    if (worldLock) {
      updateData["owner.worldLock"] = worldLock;
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      updateData,
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Remove world owner
   */
  public async removeOwner(name: string) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      {
        $unset: {
          "owner.userId":    "",
          "owner.worldLock": "",
        },
      },
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Update world tiles data
   */
  public async updateTiles(name: string, tilesData: Buffer) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      { tilesData },
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Add extra data to world
   */
  public async addExtra(name: string, extra: { type: number; data: Record<string, unknown> }) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      { $push: { extras: extra } },
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Remove extra data from world
   */
  public async removeExtra(name: string, extraType: number) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      { $pull: { extras: { type: extraType } } },
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Update world weather
   */
  public async updateWeather(name: string, weather: {
    id?: number;
    heatWave?: {
      r?: number;
      g?: number;
      b?: number;
    };
  }) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    const updateData: Record<string, unknown> = {};

    if (weather.id !== undefined) updateData["weather.id"] = weather.id;
    if (weather.heatWave) {
      if (weather.heatWave.r !== undefined) updateData["weather.heatWave.r"] = weather.heatWave.r;
      if (weather.heatWave.g !== undefined) updateData["weather.heatWave.g"] = weather.heatWave.g;
      if (weather.heatWave.b !== undefined) updateData["weather.heatWave.b"] = weather.heatWave.b;
    }

    const world = await WorldModel.findOneAndUpdate(
      { name: name.toUpperCase() },
      updateData,
      { new: true }
    );

    if (!world) {
      throw new Error(`World with name "${name}" not found`);
    }

    return world;
  }

  /**
   * Search worlds by name pattern
   */
  public async search(pattern: string, limit?: number, skip?: number) {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(process.env.DATABASE_URL as string);
    }

    let query = WorldModel.find({
      name: { $regex: pattern.toUpperCase(), $options: "i" },
    }).populate("owner.userId");

    if (skip) query = query.skip(skip);
    if (limit) query = query.limit(limit);

    return await query.exec();
  }
}
