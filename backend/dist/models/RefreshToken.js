"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RefreshToken = void 0;
const mongoose_1 = require("mongoose");
const RefreshTokenSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    token: { type: String, required: true, unique: true, index: true },
    expiresAt: { type: Date, required: true },
    isUsed: { type: Boolean, default: false },
    isRevoked: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, expires: "7d" } // Automatic TTL expiration
});
exports.RefreshToken = (0, mongoose_1.model)("RefreshToken", RefreshTokenSchema);
exports.default = exports.RefreshToken;
