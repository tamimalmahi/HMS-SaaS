import { Request, Response, NextFunction } from "express";
import Notice from "../models/Notice";
import AuditLog from "../models/AuditLog";
import { processUpload } from "../middleware/upload";
import { z } from "zod";

const noticeSchema = z.object({
  title: z.string().min(1, "Title is required"),
  content: z.string().min(1, "Content is required"),
  type: z.enum(["general", "emergency", "meal", "maintenance"]),
  priority: z.enum(["low", "medium", "high"]),
  isPinned: z.string().optional(),
  expiryDate: z.string().optional()
});

export const getNotices = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const isAdmin = ["house_admin", "assistant_admin"].includes(req.user?.role || "");
    const query: any = { houseId: req.houseId };

    // Members should not see expired notices
    if (!isAdmin) {
      query.$or = [
        { expiryDate: { $exists: false } },
        { expiryDate: null },
        { expiryDate: { $gt: new Date() } }
      ];
    }

    // Pinned notices first, then newest first
    const notices = await Notice.find(query)
      .populate("createdBy", "name username")
      .sort({ isPinned: -1, createdAt: -1 });

    return res.status(200).json(notices);
  } catch (error) {
    next(error);
  }
};

export const createNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = noticeSchema.parse(req.body);
    const house = req.house!;

    let imageUrl = undefined;
    
    // Process image attachment if present
    if (req.file) {
      // Validate storage limit
      const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
      const maxLimit = planLimits[house.plan] || planLimits.free;

      if (house.storageUsed + req.file.size > maxLimit) {
        return res.status(400).json({ message: "Storage limit reached. Cannot attach image." });
      }

      const uploadResult = await processUpload(req.file);
      imageUrl = uploadResult.fileUrl;

      house.storageUsed += uploadResult.fileSize;
      await house.save();
    }

    const notice = await Notice.create({
      houseId: req.houseId,
      title: data.title,
      content: data.content,
      type: data.type,
      priority: data.priority,
      isPinned: data.isPinned === "true",
      expiryDate: data.expiryDate ? new Date(data.expiryDate) : undefined,
      imageUrl,
      createdBy: req.user!._id
    });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "NOTICE_CREATE",
      details: `Created notice: "${notice.title}" (${notice.type} notice, priority: ${notice.priority})`
    });

    return res.status(201).json(notice);
  } catch (error) {
    next(error);
  }
};

export const updateNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = noticeSchema.parse(req.body);
    const house = req.house!;

    const notice = await Notice.findOne({ _id: id, houseId: req.houseId });
    if (!notice) {
      return res.status(404).json({ message: "Notice not found or unauthorized" });
    }

    let imageUrl = notice.imageUrl;

    if (req.file) {
      const planLimits = { free: 10 * 1024 * 1024, basic: 50 * 1024 * 1024, pro: 200 * 1024 * 1024 };
      const maxLimit = planLimits[house.plan] || planLimits.free;

      if (house.storageUsed + req.file.size > maxLimit) {
        return res.status(400).json({ message: "Storage limit reached. Cannot attach image." });
      }

      const uploadResult = await processUpload(req.file);
      imageUrl = uploadResult.fileUrl;

      house.storageUsed += uploadResult.fileSize;
      await house.save();
    }

    notice.title = data.title;
    notice.content = data.content;
    notice.type = data.type;
    notice.priority = data.priority;
    notice.isPinned = data.isPinned === "true";
    notice.expiryDate = data.expiryDate ? new Date(data.expiryDate) : undefined;
    notice.imageUrl = imageUrl;

    await notice.save();

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "NOTICE_UPDATE",
      details: `Updated notice: "${notice.title}"`
    });

    return res.status(200).json(notice);
  } catch (error) {
    next(error);
  }
};

export const deleteNotice = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const house = req.house!;

    const notice = await Notice.findOne({ _id: id, houseId: req.houseId });
    if (!notice) {
      return res.status(404).json({ message: "Notice not found or unauthorized" });
    }

    // We do not decrease house storage used unless we track the size of notice images.
    // For simplicity, we just delete the document.
    await Notice.deleteOne({ _id: id });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "NOTICE_DELETE",
      details: `Deleted notice: "${notice.title}"`
    });

    return res.status(200).json({ message: "Notice deleted successfully" });
  } catch (error) {
    next(error);
  }
};
