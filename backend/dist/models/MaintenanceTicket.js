"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MaintenanceTicket = void 0;
const mongoose_1 = require("mongoose");
const MaintenanceTicketSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    imageUrl: { type: String },
    status: {
        type: String,
        enum: ["open", "in_progress", "resolved"],
        default: "open"
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
exports.MaintenanceTicket = (0, mongoose_1.model)("MaintenanceTicket", MaintenanceTicketSchema);
exports.default = exports.MaintenanceTicket;
