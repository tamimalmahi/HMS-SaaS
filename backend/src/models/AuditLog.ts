import { Schema, model, Document } from "mongoose";

export interface IAuditLog extends Document {
  houseId: Schema.Types.ObjectId | null; // Null for global admin actions
  userId: Schema.Types.ObjectId;
  username: string;
  action: string;
  details: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", default: null, index: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    action: { type: String, required: true, index: true },
    details: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now, index: true }
  }
);

export const AuditLog = model<IAuditLog>("AuditLog", AuditLogSchema);
export default AuditLog;
