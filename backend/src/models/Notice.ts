import { Schema, model, Document } from "mongoose";

export interface INotice extends Document {
  houseId: Schema.Types.ObjectId;
  title: string;
  content: string;
  type: "general" | "emergency" | "meal" | "maintenance";
  priority: "low" | "medium" | "high";
  isPinned: boolean;
  expiryDate?: Date;
  imageUrl?: string;
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const NoticeSchema = new Schema<INotice>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    title: { type: String, required: true, trim: true },
    content: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ["general", "emergency", "meal", "maintenance"],
      default: "general"
    },
    priority: {
      type: String,
      enum: ["low", "medium", "high"],
      default: "medium"
    },
    isPinned: { type: Boolean, default: false },
    expiryDate: { type: Date },
    imageUrl: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const Notice = model<INotice>("Notice", NoticeSchema);
export default Notice;
