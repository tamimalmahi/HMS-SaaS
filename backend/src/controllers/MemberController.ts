import { Request, Response, NextFunction } from "express";
import User from "../models/User";
import Room from "../models/Room";
import AuditLog from "../models/AuditLog";
import bcrypt from "bcryptjs";
import { z } from "zod";

const createMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number is required"),
  username: z.string().min(3, "Username must be at least 3 characters").regex(/^[a-zA-Z0-9_]+$/, "Alphanumeric and underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["house_admin", "assistant_admin", "member"])
});

const updateMemberSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email format"),
  phone: z.string().min(10, "Phone number is required"),
  role: z.enum(["house_admin", "assistant_admin", "member"]),
  status: z.enum(["active", "suspended"])
});

export const getMembers = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const members = await User.find({ houseId: req.houseId }).select("-passwordHash");
    return res.status(200).json(members);
  } catch (error) {
    next(error);
  }
};

export const addMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createMemberSchema.parse(req.body);
    const house = req.house!;

    // Enforce role restrictions for Free/Basic plans (Assistant Admin requires Pro)
    if (data.role === "assistant_admin" && house.plan !== "pro") {
      return res.status(400).json({ message: "Assistant Admin role is a PRO plan feature. Please upgrade." });
    }

    // Count existing members in this house
    const memberCount = await User.countDocuments({ houseId: house._id });

    // Validate plan limits (Free: 15, Basic: 30, Pro: 100)
    const planLimits = { free: 15, basic: 30, pro: 100 };
    const maxLimit = planLimits[house.plan] || planLimits.free;

    if (memberCount >= maxLimit) {
      return res.status(400).json({ 
        message: `Plan limit reached. Your current plan (${house.plan.toUpperCase()}) allows a maximum of ${maxLimit} members. Please upgrade.` 
      });
    }

    // Check if user already exists in platform
    const existingUser = await User.findOne({
      $or: [{ email: data.email.toLowerCase() }, { username: data.username.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(400).json({ message: "Username or Email already registered in the platform." });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(data.password, salt);

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone,
      username: data.username.toLowerCase(),
      passwordHash,
      role: data.role,
      houseId: house._id,
      status: "active"
    });

    await AuditLog.create({
      houseId: house._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "MEMBER_ADD",
      details: `Added new member: ${user.name} (${user.username}) as ${user.role}`
    });

    return res.status(201).json({
      message: "Member added successfully",
      member: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const updateMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const data = updateMemberSchema.parse(req.body);
    const house = req.house!;

    if (data.role === "assistant_admin" && house.plan !== "pro") {
      return res.status(400).json({ message: "Assistant Admin role is a PRO plan feature. Please upgrade." });
    }

    const member = await User.findOne({ _id: id, houseId: req.houseId });
    if (!member) {
      return res.status(404).json({ message: "Member not found or unauthorized" });
    }

    // Prevent changing your own admin role or status to lock yourself out
    if (String(member._id) === String(req.user!._id)) {
      if (data.role !== member.role || data.status !== member.status) {
        return res.status(400).json({ message: "You cannot change your own role or suspend yourself." });
      }
    }

    // Check if email already taken by someone else
    const emailCheck = await User.findOne({ email: data.email.toLowerCase(), _id: { $ne: id } });
    if (emailCheck) {
      return res.status(400).json({ message: "Email is already taken by another user." });
    }

    member.name = data.name;
    member.email = data.email.toLowerCase();
    member.phone = data.phone;
    member.role = data.role;
    member.status = data.status;

    await member.save();

    await AuditLog.create({
      houseId: req.house!._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "MEMBER_UPDATE",
      details: `Updated member details for ${member.username}: role=${member.role}, status=${member.status}`
    });

    return res.status(200).json({
      message: "Member updated successfully",
      member: {
        id: member._id,
        name: member.name,
        email: member.email,
        phone: member.phone,
        role: member.role,
        status: member.status
      }
    });
  } catch (error) {
    next(error);
  }
};

export const deleteMember = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;

    if (String(id) === String(req.user!._id)) {
      return res.status(400).json({ message: "You cannot delete yourself." });
    }

    const member = await User.findOne({ _id: id, houseId: req.houseId });
    if (!member) {
      return res.status(404).json({ message: "Member not found or unauthorized" });
    }

    // Unassign from any room before deleting
    await Room.updateMany(
      { houseId: req.houseId, occupiedBy: id },
      { $pull: { occupiedBy: id } }
    );

    await User.deleteOne({ _id: id });

    await AuditLog.create({
      houseId: req.house!._id,
      userId: req.user!._id,
      username: req.user!.username,
      action: "MEMBER_DELETE",
      details: `Removed member: ${member.name} (${member.username})`
    });

    return res.status(200).json({ message: "Member removed from house successfully" });
  } catch (error) {
    next(error);
  }
};
