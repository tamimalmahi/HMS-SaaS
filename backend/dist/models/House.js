"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.House = void 0;
const mongoose_1 = require("mongoose");
const HouseSchema = new mongoose_1.Schema({
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    logo: { type: String, default: "" },
    coverImage: { type: String, default: "" },
    plan: { type: String, enum: ["free", "basic", "pro"], default: "free" },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    branding: {
        primaryColor: { type: String, default: "#0f172a" },
        secondaryColor: { type: String, default: "#3b82f6" }
    },
    settings: {
        dueDate: { type: String, default: "25" },
        mealRateCalculationMode: { type: String, enum: ["fixed", "dynamic"], default: "dynamic" }
    },
    storageUsed: { type: Number, default: 0 }
}, { timestamps: true });
exports.House = (0, mongoose_1.model)("House", HouseSchema);
exports.default = exports.House;
