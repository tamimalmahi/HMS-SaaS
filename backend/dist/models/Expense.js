"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Expense = void 0;
const mongoose_1 = require("mongoose");
const ExpenseSchema = new mongoose_1.Schema({
    houseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "House", required: true, index: true },
    category: {
        type: String,
        enum: ["meal", "electricity", "water", "gas", "internet", "maintenance", "other"],
        required: true
    },
    description: { type: String, required: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    date: { type: Date, required: true },
    month: { type: String, required: true, index: true }, // E.g., "2026-06"
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    attachment: {
        fileUrl: { type: String },
        fileName: { type: String },
        fileSize: { type: Number },
        uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
        uploadedAt: { type: Date }
    },
    isRecurring: { type: Boolean, default: false },
    recurringInterval: { type: String, enum: ["monthly", "weekly"] }
}, { timestamps: true });
exports.Expense = (0, mongoose_1.model)("Expense", ExpenseSchema);
exports.default = exports.Expense;
