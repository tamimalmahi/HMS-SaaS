"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Room = void 0;
const mongoose_1 = require("mongoose");
const RoomSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", required: true, index: true },
    name: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    occupiedBy: [{ type: mongoose_1.Schema.Types.ObjectId, ref: "User" }]
}, { timestamps: true });
exports.Room = (0, mongoose_1.model)("Room", RoomSchema);
exports.default = exports.Room;
