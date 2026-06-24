"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.assignMembers = exports.deleteRoom = exports.updateRoom = exports.createRoom = exports.getRooms = void 0;
const Room_1 = __importDefault(require("../models/Room"));
const User_1 = __importDefault(require("../models/User"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const zod_1 = require("zod");
const roomSchema = zod_1.z.object({
    name: zod_1.z.string().min(1, "Room name is required"),
    capacity: zod_1.z.number().min(1, "Capacity must be at least 1")
});
const assignMembersSchema = zod_1.z.object({
    memberIds: zod_1.z.array(zod_1.z.string())
});
const getRooms = async (req, res, next) => {
    try {
        const rooms = await Room_1.default.find({ houseId: req.houseId }).populate("occupiedBy", "name username phone role");
        return res.status(200).json(rooms);
    }
    catch (error) {
        next(error);
    }
};
exports.getRooms = getRooms;
const createRoom = async (req, res, next) => {
    try {
        const { name, capacity } = roomSchema.parse(req.body);
        const existingRoom = await Room_1.default.findOne({ houseId: req.houseId, name: { $regex: new RegExp(`^${name}$`, "i") } });
        if (existingRoom) {
            return res.status(400).json({ message: "A room with this name already exists in this house." });
        }
        const room = await Room_1.default.create({
            houseId: req.houseId,
            name,
            capacity,
            occupiedBy: []
        });
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "ROOM_CREATE",
            details: `Created room: ${name} (Capacity: ${capacity})`
        });
        return res.status(201).json(room);
    }
    catch (error) {
        next(error);
    }
};
exports.createRoom = createRoom;
const updateRoom = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { name, capacity } = roomSchema.parse(req.body);
        const room = await Room_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!room) {
            return res.status(404).json({ message: "Room not found or unauthorized" });
        }
        // Check if new capacity is smaller than currently occupied slots
        if (capacity < room.occupiedBy.length) {
            return res.status(400).json({
                message: `Cannot lower capacity below currently occupied count (${room.occupiedBy.length}). Unassign members first.`
            });
        }
        room.name = name;
        room.capacity = capacity;
        await room.save();
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "ROOM_UPDATE",
            details: `Updated room ${room.name}: capacity=${capacity}`
        });
        return res.status(200).json(room);
    }
    catch (error) {
        next(error);
    }
};
exports.updateRoom = updateRoom;
const deleteRoom = async (req, res, next) => {
    try {
        const { id } = req.params;
        const room = await Room_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!room) {
            return res.status(404).json({ message: "Room not found or unauthorized" });
        }
        if (room.occupiedBy.length > 0) {
            return res.status(400).json({ message: "Cannot delete room that contains members. Please unassign them first." });
        }
        await Room_1.default.deleteOne({ _id: id });
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "ROOM_DELETE",
            details: `Deleted room: ${room.name}`
        });
        return res.status(200).json({ message: "Room deleted successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.deleteRoom = deleteRoom;
const assignMembers = async (req, res, next) => {
    try {
        const { id } = req.params;
        const { memberIds } = assignMembersSchema.parse(req.body);
        const room = await Room_1.default.findOne({ _id: id, houseId: req.houseId });
        if (!room) {
            return res.status(404).json({ message: "Room not found or unauthorized" });
        }
        if (memberIds.length > room.capacity) {
            return res.status(400).json({ message: `Room capacity exceeded. Max allowed is ${room.capacity}` });
        }
        // Verify all member IDs belong to this house
        const validMembers = await User_1.default.find({
            _id: { $in: memberIds },
            houseId: req.houseId
        });
        if (validMembers.length !== memberIds.length) {
            return res.status(400).json({ message: "One or more selected members are invalid or do not belong to this house." });
        }
        room.occupiedBy = memberIds.map(mid => mid);
        await room.save();
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "ROOM_ASSIGN",
            details: `Assigned ${memberIds.length} members to room ${room.name}`
        });
        return res.status(200).json({
            message: "Members assigned successfully",
            room
        });
    }
    catch (error) {
        next(error);
    }
};
exports.assignMembers = assignMembers;
