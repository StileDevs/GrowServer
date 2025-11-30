import { Schema, model } from "mongoose";

const userSchema = new Schema({
  name:          { type: String, required: true },
  email:         { type: String, required: true, unique: true },
  emailVerified: { type: Boolean, required: true, default: false },
  image:         { type: String },
  createdAt:     { type: Date, required: true, default: Date.now },
  updatedAt:     { type: Date, required: true, default: Date.now },
  username:      { type: String, unique: true, sparse: true },
  role:          { type: String, enum: ["admin", "user"] },
  banned:        { type: Boolean },
  banReason:     { type: String },
  banExpires:    { type: Date },
  playerId:      { type: Schema.Types.ObjectId, ref: "Player" },
}, { timestamps: true });

const sessionSchema = new Schema({
  userId:    { type: String, required: true, index: true },
  expiresAt: { type: Date, required: true, index: true },
  token:     { type: String, required: true, unique: true },
  ipAddress: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, required: true, default: Date.now },
  updatedAt: { type: Date, required: true, default: Date.now },
}, { timestamps: true });

const accountSchema = new Schema({
  userId:                { type: String, required: true, index: true },
  accountId:             { type: String, required: true },
  providerId:            { type: String, required: true },
  accessToken:           { type: String },
  refreshToken:          { type: String },
  idToken:               { type: String },
  accessTokenExpiresAt:  { type: Date },
  refreshTokenExpiresAt: { type: Date },
  scope:                 { type: String },
  password:              { type: String },
  createdAt:             { type: Date, required: true, default: Date.now },
  updatedAt:             { type: Date, required: true, default: Date.now },
}, { timestamps: true });

accountSchema.index({ providerId: 1, accountId: 1 }, { unique: true });

const verificationSchema = new Schema({
  identifier: { type: String, required: true, index: true },
  value:      { type: String, required: true },
  expiresAt:  { type: Date, required: true, index: true },
  createdAt:  { type: Date, required: true, default: Date.now },
  updatedAt:  { type: Date, required: true, default: Date.now },
}, { timestamps: true });

const playerSchema = new Schema({
  name: { 
    type:      String,
    required:  true,
    unique:    true,
    lowercase: true,
    index:     true,
  },
  displayName: { type: String, required: true },
  password:    { type: String, required: true },
  role:        { type: String, required: true },
  userId:      { type: Schema.Types.ObjectId, ref: "User" },
  clothing:    {
    shirt:    { type: Number, required: true, default: 0 },
    pants:    { type: Number, required: true, default: 0 },
    feet:     { type: Number, required: true, default: 0 },
    face:     { type: Number, required: true, default: 0 },
    hand:     { type: Number, required: true, default: 0 },
    back:     { type: Number, required: true, default: 0 },
    hair:     { type: Number, required: true, default: 0 },
    mask:     { type: Number, required: true, default: 0 },
    necklace: { type: Number, required: true, default: 0 },
    ances:    { type: Number, required: true, default: 0 },
  },
  inventory: {
    max:   { type: Number, required: true, default: 16 },
    items: [{
      id:     { type: Number, required: true, default: 0 },
      amount: { type: Number, required: true, default: 0 },
    }],
  }
}, {
  timestamps: true
});

const worldSchema = new Schema({
  name: {
    type:      String,
    required:  true,
    uppercase: true, 
    unique:    true,
    index:     true
  },
  width:  { type: Number, required: true,  default: 100 },
  height: { type: Number, required: true, default: 60 },
  owner:  {
    userId:    { type: Schema.Types.ObjectId, ref: "Player" },
    worldLock: {
      x: { type: Number },
      y: { type: Number }
    }
  },
  tilesData: {
    type:     Buffer,
    required: true,
    default:  Buffer.alloc(0)
  },
  extras: [{
    _id:  false,
    type: { type: Number },
    data: { type: Schema.Types.Mixed }
  }],
  droppedItems: [{
    _id:       false,
    uid:       { type: Number, required: true },
    id:        { type: Number, required: true },
    amount:    { type: Number, default: 1 },
    x:         { type: Number, required: true },
    y:         { type: Number, required: true },
    createdAt: { type: Date, default: Date.now }
  }],
  droppedUidCounter: { type: Number, default: 1 },
  weather:           {
    id:       { type: Number, default: 41 },
    heatWave: {
      r: { type: Number, required: true, default: 0, min: 0, max: 255 },
      g: { type: Number, required: true, default: 0, min: 0, max: 255 },
      b: { type: Number, required: true, default: 0, min: 0, max: 255 },
    }
  }
}, {
  timestamps: true
});

// GrowServer Schema
export const PlayerModel = model("Player", playerSchema);
export const WorldModel = model("World", worldSchema);

// better-auth Schema
export const UserModel = model("User", userSchema);
export const SessionModel = model("Session", sessionSchema);
export const AccountModel = model("Account", accountSchema);
export const VerificationModel = model("Verification", verificationSchema);


