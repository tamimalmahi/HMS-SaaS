"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLog = void 0;
const mongoose_1 = require("mongoose");
const AuditLogSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", default: null, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    username: { type: String, required: true },
    action: { type: String, required: true, index: true },
    details: { type: String, required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    createdAt: { type: Date, default: Date.now, index: true }
});
exports.AuditLog = (0, mongoose_1.model)("AuditLog", AuditLogSchema);
exports.default = exports.AuditLog;
