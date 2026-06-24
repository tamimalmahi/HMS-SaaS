import { Request, Response, NextFunction } from "express";
import Room from "../models/Room";
import User from "../models/User";
import AuditLog from "../models/AuditLog";
import { z } from "zod";

const roomSchema = z.object({
  name: z.string().min(1, "Room name is required"),
  capacity: z.number().min(1, "Capacity must be at least 1")
});

const assignMembersSchema = z.object({
  memberIds: z.array(z.string())
});

export const getRooms = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const rooms = await Room.find({ houseId: req.houseId }).populate("occupiedBy", "name username phone role");
    return res.status(200).json(rooms);
  } catch (error) {
    next(error);
  }
};

export const createRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { name, capacity } = roomSchema.parse(req.body);

    const existingRoom = await Room.findOne({ houseId: req.houseId, name: { $regex: new RegExp(`^${name}$`, "i") } });
    if (existingRoom) {
      return res.status(400).json({ message: "A room with this name already exists in this house." });
    }

    const room = await Room.create({
      houseId: req.houseId,
      name,
      capacity,
      occupiedBy: []
    });

    await AuditLog.create({
      houseId: req.house!._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "ROOM_CREATE",
      details: `Created room: ${name} (Capacity: ${capacity})`
    });

    return res.status(201).json(room);
  } catch (error) {
    next(error);
  }
};

export const updateRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, capacity } = roomSchema.parse(req.body);

    const room = await Room.findOne({ _id: id, houseId: req.houseId });
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

    await AuditLog.create({
      houseId: req.house!._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "ROOM_UPDATE",
      details: `Updated room ${room.name}: capacity=${capacity}`
    });

    return res.status(200).json(room);
  } catch (error) {
    next(error);
  }
};

export const deleteRoom = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({ _id: id, houseId: req.houseId });
    if (!room) {
      return res.status(404).json({ message: "Room not found or unauthorized" });
    }

    if (room.occupiedBy.length > 0) {
      return res.status(400).json({ message: "Cannot delete room that contains members. Please unassign them first." });
    }

    await Room.deleteOne({ _id: id });

    await AuditLog.create({
      houseId: req.house!._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "ROOM_DELETE",
      details: `Deleted room: ${room.name}`
    });

    return res.status(200).json({ message: "Room deleted successfully" });
  } catch (error) {
    next(error);
  }
};

export const assignMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { memberIds } = assignMembersSchema.parse(req.body);

    const room = await Room.findOne({ _id: id, houseId: req.houseId });
    if (!room) {
      return res.status(404).json({ message: "Room not found or unauthorized" });
    }

    if (memberIds.length > room.capacity) {
      return res.status(400).json({ message: `Room capacity exceeded. Max allowed is ${room.capacity}` });
    }

    // Verify all member IDs belong to this house
    const validMembers = await User.find({
      _id: { $in: memberIds },
      houseId: req.houseId
    });

    if (validMembers.length !== memberIds.length) {
      return res.status(400).json({ message: "One or more selected members are invalid or do not belong to this house." });
    }

    room.occupiedBy = memberIds.map(mid => mid as any);
    await room.save();

    await AuditLog.create({
      houseId: req.house!._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "ROOM_ASSIGN",
      details: `Assigned ${memberIds.length} members to room ${room.name}`
    });

    return res.status(200).json({
      message: "Members assigned successfully",
      room
    });
  } catch (error) {
    next(error);
  }
};
