"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteExpense = exports.updateExpense = exports.createExpense = exports.getExpenses = void 0;
const Expense_1 = __importDefault(require("../models/Expense"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const upload_1 = require("../middleware/upload");
const zod_1 = require("zod");
const expenseSchema = zod_1.z.object({
    category: zod_1.z.enum(["meal", "electricity", "water", "gas", "internet", "maintenance", "other"]),
    description: zod_1.z.string().min(1, "Description is required"),
    amount: zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal amount"),
    date: zod_1.z.string().min(1, "Date is required"),
    isRecurring: zod_1.z.string().optional(),
    recurringInterval: zod_1.z.enum(["monthly", "weekly"]).optional()
});
const getExpenses = async (req, res, next) => {
    try {
        const { month, category } = req.query;
        const query = { houseId: req.houseId };
        if (month) {
            query.month = String(month); // E.g. "2026-06"
        }
        if (category) {
            query.category = String(category);
        }
        const expenses = await Expense_1.default.find(query).populate("createdBy", "name username").sort({ date: -1 });
        return res.status(200).json(expenses);
    }
    catch (error) {
        next(error);
    }
};
exports.getExpenses = getExpenses;
const createExpense = async (req, res, next) => {
    try {
        const data = expenseSchema.parse(req.body);
        const house = req.house;
        let attachmentMetadata = undefined;
        // Handle File Upload if present
        if (req.file) {
            // 1. Expense attachments require Basic or Pro Plan
            if (house.plan === "free") {
                return res.status(400).json({ message: "Expense attachments are only supported in Basic and Pro plans. Please upgrade." });
            }
            // 2. Validate Storage usage
            const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
            const maxLimit = planLimits[house.plan] || planLimits.free;
            if (house.storageUsed + req.file.size > maxLimit) {
                return res.status(400).json({ message: "Storage limit reached. Cannot upload file." });
            }
            // 3. Upload to Cloudinary / Local storage fallback
            const uploadResult = await (0, upload_1.processUpload)(req.file);
            attachmentMetadata = {
                fileUrl: uploadResult.fileUrl,
                fileName: uploadResult.fileName,
                fileSize: uploadResult.fileSize,
                uploadedBy: req.user._id,
                uploadedAt: new Date()
            };
            // Increase house storage count
            house.storageUsed += uploadResult.fileSize;
            await house.save();
        }
        const expenseDate = new Date(data.date);
        const expenseMonth = data.date.slice(0, 7); // Format: "YYYY-MM"
        const expense = await Expense_1.default.create({
            houseId: req.houseId,
            category: data.category,
            description: data.description,
            amount: parseFloat(data.amount),
            date: expenseDate,
            month: expenseMonth,
            createdBy: req.user._id,
            attachment: attachmentMetadata,
            isRecurring: data.isRecurring === "true",
            recurringInterval: data.recurringInterval
        });
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "EXPENSE_CREATE",
            details: `Created expense category: ${expense.category}, amount: ৳${expense.amount} (Month: ${expense.month})`
        });
        return res.status(201).json(expense);
    }
    catch (error) {
        next(error);
    }
};
exports.createExpense = createExpense;
const updateExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const data = expenseSchema.parse(req.body);
        const house = req.house;
        const expense = await Expense_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found or unauthorized" });
        }
        let attachmentMetadata = expense.attachment;
        // Handle File Upload if present
        if (req.file) {
            if (house.plan === "free") {
                return res.status(400).json({ message: "Expense attachments are only supported in Basic and Pro plans." });
            }
            // Check storage
            const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
            const maxLimit = planLimits[house.plan] || planLimits.free;
            // Subtract old attachment size if it exists, since we replace it
            const oldSize = expense.attachment ? expense.attachment.fileSize : 0;
            if (house.storageUsed - oldSize + req.file.size > maxLimit) {
                return res.status(400).json({ message: "Storage limit reached. Cannot upload file." });
            }
            // Upload new file
            const uploadResult = await (0, upload_1.processUpload)(req.file);
            attachmentMetadata = {
                fileUrl: uploadResult.fileUrl,
                fileName: uploadResult.fileName,
                fileSize: uploadResult.fileSize,
                uploadedBy: req.user._id,
                uploadedAt: new Date()
            };
            // Update house storage count
            house.storageUsed = house.storageUsed - oldSize + uploadResult.fileSize;
            await house.save();
        }
        const expenseDate = new Date(data.date);
        const expenseMonth = data.date.slice(0, 7);
        expense.category = data.category;
        expense.description = data.description;
        expense.amount = parseFloat(data.amount);
        expense.date = expenseDate;
        expense.month = expenseMonth;
        expense.attachment = attachmentMetadata;
        expense.isRecurring = data.isRecurring === "true";
        expense.recurringInterval = data.recurringInterval;
        await expense.save();
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "EXPENSE_UPDATE",
            details: `Updated expense: category=${expense.category}, amount=৳${expense.amount}`
        });
        return res.status(200).json(expense);
    }
    catch (error) {
        next(error);
    }
};
exports.updateExpense = updateExpense;
const deleteExpense = async (req, res, next) => {
    try {
        const { id } = req.params;
        const house = req.house;
        const expense = await Expense_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!expense) {
            return res.status(404).json({ message: "Expense not found or unauthorized" });
        }
        // Free up storage used by attachment
        if (expense.attachment) {
            house.storageUsed = Math.max(0, house.storageUsed - expense.attachment.fileSize);
            await house.save();
        }
        await Expense_1.default.deleteOne({ _id: id });
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "EXPENSE_DELETE",
            details: `Deleted expense category: ${expense.category}, amount: ৳${expense.amount}`
        });
        return res.status(200).json({ message: "Expense deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteExpense = deleteExpense;
