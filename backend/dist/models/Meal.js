"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Meal = void 0;
const mongoose_1 = require("mongoose");
const MealSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", required: true, index: true },
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    date: { type: Date, required: true, index: true },
    breakfast: { type: Number, default: 0, min: 0 },
    lunch: { type: Number, default: 0, min: 0 },
    dinner: { type: Number, default: 0, min: 0 },
    isOff: { type: Boolean, default: false }
}, { timestamps: true });
// Compound index to ensure one meal entry per user per day
MealSchema.index({ userId: 1, date: 1 }, { unique: true });
exports.Meal = (0, mongoose_1.model)("Meal", MealSchema);
exports.default = exports.Meal;
