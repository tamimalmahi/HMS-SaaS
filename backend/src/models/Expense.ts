import { Schema, model, Document } from "mongoose";

export interface IExpense extends Document {
  houseId: Schema.Types.ObjectId;
  category: "meal" | "electricity" | "water" | "gas" | "internet" | "maintenance" | "other";
  description: string;
  amount: number;
  date: Date;
  month: string; // Format: YYYY-MM
  createdBy: Schema.Types.ObjectId;
  attachment?: {
    fileUrl: string;
    fileName: string;
    fileSize: number;
    uploadedBy: Schema.Types.ObjectId;
    uploadedAt: Date;
  };
  isRecurring: boolean;
  recurringInterval?: "monthly" | "weekly";
  createdAt: Date;
  updatedAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    category: {
      type: String,
      enum: ["meal", "electricity", "water", "gas", "internet", "maintenance", "other"],
      required: true
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    month: { type: String, required: true, index: true }, // E.g., "2026-06"
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    attachment: {
      fileUrl: { type: String },
      fileName: { type: String },
      fileSize: { type: Number },
      uploadedBy: { type: Schema.Types.ObjectId, ref: "User" },
      uploadedAt: { type: Date }
    },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: ["monthly", "weekly"] }
  },
  { timestamps: true }
);

export const Expense = model<IExpense>("Expense", ExpenseSchema);
export default Expense;
