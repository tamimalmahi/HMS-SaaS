"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.User = void 0;
const mongoose_1 = require("mongoose");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    username: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    role: {
        type: String,
        enum: ["super_admin", "ops_moderator", "support_moderator", "finance_moderator", "house_admin", "assistant_admin", "member"],
        required: true
    },
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", default: null, index: true },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    loginAttempts: { type: Number, default: 0, required: true },
    lockUntil: { type: Date }
}, { timestamps: true });
// Method to verify passwords
UserSchema.methods.comparePassword = async function (candidate) {
    return bcryptjs_1.default.compare(candidate, this.passwordHash);
};
exports.User = (0, mongoose_1.model)("User", UserSchema);
exports.default = exports.User;
