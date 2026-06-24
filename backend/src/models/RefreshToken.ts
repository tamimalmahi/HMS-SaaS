import { Schema, model, Document } from "mongoose";

export interface IRefreshToken extends Document {
  userId: Schema.Types.ObjectId;
  token: string;
  expiresAt: Date;
  isUsed: boolean;
  isRevoked: boolean;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    isRevoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: "7d" } // Automatic TTL expiration
  }
);

export const RefreshToken = model<IRefreshToken>("RefreshToken", RefreshTokenSchema);
export default RefreshToken;
