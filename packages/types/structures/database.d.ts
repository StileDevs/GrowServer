import { type ObjectId } from "mongoose";

// better-auth types
export interface User {
  name:          string;
  email:         string;
  emailVerified: boolean;
  image?:        string;
  createdAt:     Date;
  updatedAt:     Date;
  username?:     string;
  role?:         "admin" | "user";
  banned?:       boolean;
  banReason?:    string;
  banExpires?:   Date;
  playerId?:     string | ObjectId;
}

export interface Session {
  userId:    string;
  expiresAt: Date;
  token:     string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface Account {
  userId:                string;
  accountId:             string;
  providerId:            string;
  accessToken?:          string;
  refreshToken?:         string;
  idToken?:              string;
  accessTokenExpiresAt?: Date;
  refreshTokenExpiresAt?: Date;
  scope?:                string;
  password?:             string;
  createdAt:             Date;
  updatedAt:             Date;
}

export interface Verification {
  identifier: string;
  value:      string;
  expiresAt:  Date;
  createdAt:  Date;
  updatedAt:  Date;
}

// GrowServer types
export interface Player {
  _id:         ObjectId;
  name:        string;
  displayName: string;
  password:    string;
  role:        string;
  userId?:     ObjectId;
  clothing:    {
    shirt:    number;
    pants:    number;
    feet:     number;
    face:     number;
    hand:     number;
    back:     number;
    hair:     number;
    mask:     number;
    necklace: number;
    ances:    number;
  };
  inventory: {
    max:   number;
    items: Array<{
      id:     number;
      amount: number;
    }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface World {
  _id:       ObjectId;
  name:      string;
  width:     number;
  height:    number;
  owner?:    {
    userId?:    ObjectId;
    worldLock?: {
      x: number;
      y: number;
    };
  };
  tilesData: Buffer;
  extras:    Array<{
    type: number;
    data: Record<string, unknown>;
  }>;
  weather: {
    id:       number;
    heatWave: {
      r: number;
      g: number;
      b: number;
    };
  };
  createdAt: Date;
  updatedAt: Date;
}
