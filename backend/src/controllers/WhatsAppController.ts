import { Request, Response, NextFunction } from "express";
import WhatsAppBroadcastLog from "../models/WhatsAppBroadcastLog";
import AuditLog from "../models/AuditLog";
import { z } from "zod";

const broadcastSchema = z.object({
  type: z.enum(["due_reminder", "meal_notice", "emergency", "custom"]),
  recipientPhone: z.string().min(10, "Valid recipient phone number is required"),
  variables: z.record(z.string())
});

export const getBroadcastLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const house = req.house!;
    if (house.plan !== "pro") {
      return res.status(400).json({ message: "WhatsApp Broadcast is a PRO plan feature. Please upgrade your subscription." });
    }

    const logs = await WhatsAppBroadcastLog.find({ houseId: req.houseId })
      .populate("sentBy", "name username")
      .sort({ createdAt: -1 });

    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};

export const generateBroadcastLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const house = req.house!;
    if (house.plan !== "pro") {
      return res.status(400).json({ message: "WhatsApp Broadcast is a PRO plan feature. Please upgrade your subscription." });
    }

    const { type, recipientPhone, variables } = broadcastSchema.parse(req.body);

    let message = "";

    // Template Mapping
    if (type === "due_reminder") {
      const amount = variables.amount || "0";
      const month = variables.month || "this month";
      const dueDate = variables.dueDate || house.settings.dueDate || "25th";
      message = `*DUE REMINDER [${house.name.toUpperCase()}]*\nDear Member, your monthly dues of ৳${amount} for ${month} is due by ${dueDate}. Please clear your dues as soon as possible. Thank you!`;
    } else if (type === "meal_notice") {
      const name = variables.memberName || "A member";
      const date = variables.date || "today";
      const status = variables.status || "OFF";
      message = `*MEAL NOTICE [${house.name.toUpperCase()}]*\nNotice: ${name} has toggled their meal status to ${status} for ${date}.`;
    } else if (type === "emergency") {
      const title = variables.title || "Emergency Alert";
      const desc = variables.description || "";
      message = `*🚨 EMERGENCY NOTICE [${house.name.toUpperCase()}] 🚨*\n*${title}*\n${desc}\nPlease check the notice board for further details.`;
    } else {
      // Custom message
      message = variables.customText || "";
    }

    if (!message) {
      return res.status(400).json({ message: "Message body cannot be empty" });
    }

    // Format phone number to international format (remove non-digits, ensure country code)
    let formattedPhone = recipientPhone.replace(/\D/g, "");
    if (formattedPhone.startsWith("0")) {
      // Default to Bangladesh country code if starts with local prefix
      formattedPhone = "88" + formattedPhone;
    }

    // Generate Click-to-Chat Link
    const whatsappLink = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    // Log the broadcast in MongoDB
    const broadcastLog = await WhatsAppBroadcastLog.create({
      houseId: req.houseId,
      type,
      recipientPhone: formattedPhone,
      message,
      sentBy: req.user!._id
    });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "WHATSAPP_BROADCAST",
      details: `Generated WhatsApp broadcast link of type: ${type} for number: ${formattedPhone}`
    });

    return res.status(200).json({
      message: "Broadcast link generated successfully",
      whatsappLink,
      broadcastLog
    });
  } catch (error) {
    next(error);
  }
};
