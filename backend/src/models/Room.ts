import { Schema, model, Document } from "mongoose";

export interface IRoom extends Document {
  houseId: Schema.Types.ObjectId;
  name: string;
  capacity: number;
  occupiedBy: Schema.Types.ObjectId[];
  createdAt: Date;
  updatedAt: Date;
}

const RoomSchema = new Schema<IRoom>(
  {
    houseId: { type: Schema.Types.ObjectId, ref: "House", required: true, index: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    occupiedBy: [{ type: Schema.Types.ObjectId, ref: "User" }]
  },
  { timestamps: true }
);

export const Room = model<IRoom>("Room", RoomSchema);
export default Room;
