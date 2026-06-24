"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Notice = void 0;
const mongoose_1 = require("mongoose");
const NoticeSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", required: true, index: true },
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
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });
exports.Notice = (0, mongoose_1.model)("Notice", NoticeSchema);
exports.default = exports.Notice;
