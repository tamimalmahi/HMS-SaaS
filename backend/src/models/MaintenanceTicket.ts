import { Schema, model, Document } from "mongoose";

export interface IMaintenanceTicket extends Document {
  houseId: Schema.Types.ObjectId;
  title: string;
  description: string;
  imageUrl?: string;
  status: "open" | "in_progress" | "resolved";
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const MaintenanceTicketSchema = new Schema<IMaintenanceTicket>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved"],
      default: "open"
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true }
  },
  { timestamps: true }
);

export const MaintenanceTicket = model<IMaintenanceTicket>("MaintenanceTicket", MaintenanceTicketSchema);
export default MaintenanceTicket;
