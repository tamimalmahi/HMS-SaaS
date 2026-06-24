import { Request, Response, NextFunction } from "express";
import House from "../models/House";
import User from "../models/User";
import AuditLog from "../models/AuditLog";
import Expense from "../models/Expense";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["active", "suspended"])
});

const updatePlanSchema = z.object({
  plan: z.enum(["free", "basic", "pro"])
});

export const getHouses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const houses = await House.find().sort({ createdAt: -1 });
    return res.status(200).json(houses);
  } catch (error) {
    next(error);
  }
};

export const updateHouseStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { status } = updateStatusSchema.parse(req.body);

    const house = await House.findById(id);
    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    house.status = status;
    await house.save();

    await AuditLog.create({
      houseId: null, // System-level
      userId: req.user!._id,
      username: req.user!.username,
      action: "ADMIN_HOUSE_STATUS",
      details: `Platform admin set house: ${house.name} (${house.slug}) status to ${status}`
    });

    return res.status(200).json({
      message: `House status updated to ${status}`,
      house
    });
  } catch (error) {
    next(error);
  }
};

export const updateHousePlan = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { plan } = updatePlanSchema.parse(req.body);

    const house = await House.findById(id);
    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    const oldPlan = house.plan;
    house.plan = plan;
    await house.save();

    await AuditLog.create({
      houseId: null,
      userId: req.user!._id,
      username: req.user!.username,
      action: "ADMIN_HOUSE_PLAN",
      details: `Platform admin upgraded house: ${house.name} plan from ${oldPlan} to ${plan}`
    });

    return res.status(200).json({
      message: `House plan updated to ${plan}`,
      house
    });
  } catch (error) {
    next(error);
  }
};

export const getSystemAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const totalHouses = await House.countDocuments();
    const activeHouses = await House.countDocuments({ status: "active" });
    const suspendedHouses = await House.countDocuments({ status: "suspended" });

    const totalMembers = await User.countDocuments({ role: "member" });
    const totalAdmins = await User.countDocuments({ role: "house_admin" });

    // Plan distributions
    const freePlans = await House.countDocuments({ plan: "free" });
    const basicPlans = await House.countDocuments({ plan: "basic" });
    const proPlans = await House.countDocuments({ plan: "pro" });

    // Sum up overall storage bytes
    const houses = await House.find().select("storageUsed");
    const totalStorageBytes = houses.reduce((sum, h) => sum + h.storageUsed, 0);

    return res.status(200).json({
      houses: {
        total: totalHouses,
        active: activeHouses,
        suspended: suspendedHouses
      },
      users: {
        members: totalMembers,
        admins: totalAdmins,
        total: totalMembers + totalAdmins
      },
      plans: {
        free: freePlans,
        basic: basicPlans,
        pro: proPlans
      },
      storage: {
        totalBytes: totalStorageBytes,
        totalMB: (totalStorageBytes / (1024 * 1024)).toFixed(2)
      }
    });
  } catch (error) {
    next(error);
  }
};

export const getPlatformAuditLogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
    return res.status(200).json(logs);
  } catch (error) {
    next(error);
  }
};
