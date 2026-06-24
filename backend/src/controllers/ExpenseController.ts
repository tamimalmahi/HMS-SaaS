import { Request, Response, NextFunction } from "express";
import Expense from "../models/Expense";
import AuditLog from "../models/AuditLog";
import House from "../models/House";
import { processUpload } from "../middleware/upload";
import { z } from "zod";

const expenseSchema = z.object({
  category: z.enum(["meal", "electricity", "water", "gas", "internet", "maintenance", "other"]),
  description: z.string().min(1, "Description is required"),
  amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "Must be a valid decimal amount"),
  date: z.string().min(1, "Date is required"),
  isRecurring: z.string().optional(),
  recurringInterval: z.enum(["monthly", "weekly"]).optional()
});

export const getExpenses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { month, category } = req.query;
    const query: any = { houseId: req.houseId };

    if (month) {
      query.month = String(month); // E.g. "2026-06"
    }
    if (category) {
      query.category = String(category);
    }

    const expenses = await Expense.find(query).populate("createdBy", "name username").sort({ date: -1 });
    return res.status(200).json(expenses);
  } catch (error) {
    next(error);
  }
};

export const createExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = expenseSchema.parse(req.body);
    const house = req.house!;

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
      const uploadResult = await processUpload(req.file);
      
      attachmentMetadata = {
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        uploadedBy: req.user!._id as any,
        uploadedAt: new Date()
      };

      // Increase house storage count
      house.storageUsed += uploadResult.fileSize;
      await house.save();
    }

    const expenseDate = new Date(data.date);
    const expenseMonth = data.date.slice(0, 7); // Format: "YYYY-MM"

    const expense = await Expense.create({
      houseId: req.houseId,
      category: data.category,
      description: data.description,
      amount: parseFloat(data.amount),
      date: expenseDate,
      month: expenseMonth,
      createdBy: req.user!._id,
      attachment: attachmentMetadata,
      isRecurring: data.isRecurring === "true",
      recurringInterval: data.recurringInterval
    });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "EXPENSE_CREATE",
      details: `Created expense category: ${expense.category}, amount: ৳${expense.amount} (Month: ${expense.month})`
    });

    return res.status(201).json(expense);
  } catch (error) {
    next(error);
  }
};

export const updateExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = expenseSchema.parse(req.body);
    const house = req.house!;

    const expense = await Expense.findOne({ _id: id, houseId: req.houseId });
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
      const uploadResult = await processUpload(req.file);

      attachmentMetadata = {
        fileUrl: uploadResult.fileUrl,
        fileName: uploadResult.fileName,
        fileSize: uploadResult.fileSize,
        uploadedBy: req.user!._id as any,
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

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "EXPENSE_UPDATE",
      details: `Updated expense: category=${expense.category}, amount=৳${expense.amount}`
    });

    return res.status(200).json(expense);
  } catch (error) {
    next(error);
  }
};

export const deleteExpense = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const house = req.house!;

    const expense = await Expense.findOne({ _id: id, houseId: req.houseId });
    if (!expense) {
      return res.status(404).json({ message: "Expense not found or unauthorized" });
    }

    // Free up storage used by attachment
    if (expense.attachment) {
      house.storageUsed = Math.max(0, house.storageUsed - expense.attachment.fileSize);
      await house.save();
    }

    await Expense.deleteOne({ _id: id });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "EXPENSE_DELETE",
      details: `Deleted expense category: ${expense.category}, amount: ৳${expense.amount}`
    });

    return res.status(200).json({ message: "Expense deleted successfully" });
  } catch (error) {
    next(error);
  }
};
