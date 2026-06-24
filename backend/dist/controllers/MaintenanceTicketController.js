"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateTicketStatus = exports.createTicket = exports.getTickets = void 0;
const MaintenanceTicket_1 = __importDefault(require("../models/MaintenanceTicket"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const upload_1 = require("../middleware/upload");
const zod_1 = require("zod");
const ticketSchema = zod_1.z.object({
    title: zod_1.z.string().min(1, "Title is required"),
    description: zod_1.z.string().min(1, "Description is required")
});
const updateStatusSchema = zod_1.z.object({
    status: zod_1.z.enum(["open", "in_progress", "resolved"])
});
const getTickets = async (req, res, next) => {
    try {
        const house = req.house;
        if (house.plan !== "pro") {
            return res.status(400).json({ message: "Maintenance Tickets are a PRO plan feature. Please upgrade your subscription." });
        }
        const query = { houseId: req.houseId };
        // Members should only see tickets they created
        if (req.user.role === "member") {
            query.createdBy = req.user._id;
        }
        const tickets = await MaintenanceTicket_1.default.find(query)
            .populate("createdBy", "name username room")
            .sort({ createdAt: -1 });
        return res.status(200).json(tickets);
    }
    catch (error) {
        next(error);
    }
};
exports.getTickets = getTickets;
const createTicket = async (req, res, next) => {
    try {
        const house = req.house;
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
            const uploadResult = await (0, upload_1.processUpload)(req.file);
            imageUrl = uploadResult.fileUrl;
            house.storageUsed += uploadResult.fileSize;
            await house.save();
        }
        const ticket = await MaintenanceTicket_1.default.create({
            houseId: req.houseId,
            title: data.title,
            description: data.description,
            imageUrl,
            status: "open",
            createdBy: req.user._id
        });
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "TICKET_CREATE",
            details: `Created maintenance ticket: "${ticket.title}"`
        });
        return res.status(201).json(ticket);
    }
    catch (error) {
        next(error);
    }
};
exports.createTicket = createTicket;
const updateTicketStatus = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { status } = updateStatusSchema.parse(req.body);
        const house = req.house;
        if (house.plan !== "pro") {
            return res.status(400).json({ message: "Maintenance Tickets are a PRO plan feature." });
        }
        const ticket = await MaintenanceTicket_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!ticket) {
            return res.status(404).json({ message: "Ticket not found or unauthorized" });
        }
        const oldStatus = ticket.status;
        ticket.status = status;
        await ticket.save();
        await AuditLog_1.default.create({
            houseId: house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "TICKET_STATUS_UPDATE",
            details: `Updated maintenance ticket status from ${oldStatus} to ${status}`
        });
        return res.status(200).json(ticket);
    }
    catch (error) {
        next(error);
    }
};
exports.updateTicketStatus = updateTicketStatus;
