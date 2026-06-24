import { Schema, model, Document } from "mongoose";

export interface IWhatsAppBroadcastLog extends Document {
  houseId: Schema.Types.ObjectId;
  type: "due_reminder" | "meal_notice" | "emergency" | "custom";
  recipientPhone: string;
  message: string;
  sentBy: Schema.Types.ObjectId;
  createdAt: Date;
}

const WhatsAppBroadcastLogSchema = new Schema<IWhatsAppBroadcastLog>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    type: {
      type: String,
      enum: ["due_reminder", "meal_notice", "emergency", "custom"],
      required: true
    },
    recipientPhone: { type: String, required: true },
    message: { type: String, required: true },
    sentBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now, index: true }
  }
);

export const WhatsAppBroadcastLog = model<IWhatsAppBroadcastLog>("WhatsAppBroadcastLog", WhatsAppBroadcastLogSchema);
export default WhatsAppBroadcastLog;
