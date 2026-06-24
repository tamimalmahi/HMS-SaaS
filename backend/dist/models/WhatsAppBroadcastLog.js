"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WhatsAppBroadcastLog = void 0;
const mongoose_1 = require("mongoose");
const WhatsAppBroadcastLogSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", required: true, index: true },
    type: {
        type: String,
        enum: ["due_reminder", "meal_notice", "emergency", "custom"],
        required: true
    },
    recipientPhone: { type: String, required: true },
    message: { type: String, required: true },
    sentBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    createdAt: { type: Date, default: Date.now, index: true }
});
exports.WhatsAppBroadcastLog = (0, mongoose_1.model)("WhatsAppBroadcastLog", WhatsAppBroadcastLogSchema);
exports.default = exports.WhatsAppBroadcastLog;
