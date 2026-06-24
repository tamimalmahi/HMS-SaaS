import { Request, Response, NextFunction } from "express";
import MaintenanceTicket from "../models/MaintenanceTicket";
import AuditLog from "../models/AuditLog";
import { processUpload } from "../middleware/upload";
import { z } from "zod";

const ticketSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Description is required")
});

const updateStatusSchema = z.object({
  status: z.enum(["open", "in_progress", "resolved"])
});

export const getTickets = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const house = req.house!;
    if (house.plan !== "pro") {
      return res.status(400).json({ message: "Maintenance Tickets are a PRO plan feature. Please upgrade your subscription." });
    }

    const query: any = { houseId: req.houseId };

    // Members should only see tickets they created
    if (req.user!.role === "member") {
      query.createdBy = req.user!._id;
    }

    const tickets = await MaintenanceTicket.find(query)
      .populate("createdBy", "name username room")
      .sort({ createdAt: -1 });

    return res.status(200).json(tickets);
  } catch (error) {
    next(error);
  }
};

export const createTicket = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const house = req.house!;
    if (house.plan !== "pro") {
      return res.status(400).json({ message: "Maintenance Tickets are a PRO plan feature. Please upgrade your subscription." });
    }

    const data = ticketSchema.parse(req.body);
    let imageUrl = undefined;

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

    const ticket = await MaintenanceTicket.create({
      houseId: req.houseId,
      title: data.title,
      description: data.description,
      imageUrl,
      status: "open",
      createdBy: req.user!._id
    });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "TICKET_CREATE",
      details: `Created maintenance ticket: "${ticket.title}"`
    });

    return res.status(201).json(ticket);
  } catch (error) {
    next(error);
  }
};

export const updateTicketStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);
    const house = req.house!;

    if (house.plan !== "pro") {
      return res.status(400).json({ message: "Maintenance Tickets are a PRO plan feature." });
    }

    const ticket = await MaintenanceTicket.findOne({ _id: id, houseId: req.houseId });
    if (!ticket) {
      return res.status(404).json({ message: "Ticket not found or unauthorized" });
    }

    const oldStatus = ticket.status;
    ticket.status = status;
    await ticket.save();

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "TICKET_STATUS_UPDATE",
      details: `Updated maintenance ticket status from ${oldStatus} to ${status}`
    });

    return res.status(200).json(ticket);
  } catch (error) {
    next(error);
  }
};
