import { Schema, model, Document } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  phone: string;
  username: string;
  passwordHash: string;
  role: "super_admin" | "ops_moderator" | "support_moderator" | "finance_moderator" | "house_admin" | "assistant_admin" | "member";
  houseId: Schema.Types.ObjectId | null; // Null for platform roles (Super Admin, etc.)
  status: "active" | "suspended";
  loginAttempts: number;
  lockUntil?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
      type: String,
      enum: ["super_admin", "ops_moderator", "support_moderator", "finance_moderator", "house_admin", "assistant_admin", "member"],
      required: true
    },
    houseId: { type: Schema.Types.ObjectId, ref: "House", default: null, index: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    loginAttempts: { type: Number, default: 0, required: true },
    lockUntil: { type: Date }
  },
  { timestamps: true }
);

// Method to verify passwords
UserSchema.methods.comparePassword = async function (candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.passwordHash);
};

export const User = model<IUser>("User", UserSchema);
export default User;
