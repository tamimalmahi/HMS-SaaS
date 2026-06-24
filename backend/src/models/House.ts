import { Schema, model, Document } from "mongoose";

export interface IHouse extends Document {
  name: string;
  slug: string;
  logo?: string;
  coverImage?: string;
  plan: "free" | "basic" | "pro";
  status: "active" | "suspended";
  branding: {
    primaryColor: string;
    secondaryColor: string;
  };
  settings: {
    dueDate: string;
    mealRateCalculationMode: "fixed" | "dynamic";
  };
  storageUsed: number; // In bytes
  createdAt: Date;
  updatedAt: Date;
}

const HouseSchema = new Schema<IHouse>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    logo: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    plan: { type: String, enum: ["free", "basic", "pro"], default: "free" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    branding: {
      primaryColor: { type: String, default: "#0f172a" },
      secondaryColor: { type: String, default: "#3b82f6" }
    },
    settings: {
      dueDate: { type: String, default: "25" },
      mealRateCalculationMode: { type: String, enum: ["fixed", "dynamic"], default: "dynamic" }
    },
    storageUsed: { type: Number, default: 0 }
  },
  { timestamps: true }
);

export const House = model<IHouse>("House", HouseSchema);
export default House;
