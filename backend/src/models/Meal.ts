import { Schema, model, Document } from "mongoose";

export interface IMeal extends Document {
  houseId: Schema.Types.ObjectId;
  userId: Schema.Types.ObjectId;
  date: Date;
  breakfast: number;
  lunch: number;
  dinner: number;
  isOff: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MealSchema = new Schema<IMeal>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    breakfast: { type: Number, default: 0, min: 0 },
    lunch: { type: Number, default: 0, min: 0 },
    dinner: { type: Number, default: 0, min: 0 },
    isOff: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Compound index to ensure one meal entry per user per day
MealSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Meal = model<IMeal>("Meal", MealSchema);
export default Meal;
