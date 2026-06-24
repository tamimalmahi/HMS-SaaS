import { Request, Response, NextFunction } from "express";
import House from "../models/House";

export const tenantIsolation = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const slug = req.headers["x-house-slug"] || req.params.houseSlug;
    if (!slug) {
      return res.status(400).json({ message: "Tenant House Slug is required in path or x-house-slug header" });
    }

    const house = await House.findOne({ slug: String(slug).toLowerCase() });
    if (!house) {
      return res.status(404).json({ message: "House not found" });
    }

    if (house.status === "suspended") {
      return res.status(403).json({ message: "This house/mess has been suspended. Please contact the administrator." });
    }

    req.house = house;
    // Set houseId string for easy DB querying
    req.houseId = String(house._id);

    // If request has authenticated user, enforce tenant ownership
    if (req.user) {
      // Platform-level roles are allowed to access houses for moderation/support
      const isPlatformUser = ["super_admin", "ops_moderator", "support_moderator", "finance_moderator"].includes(req.user.role);
      
      if (!isPlatformUser) {
        if (!req.user.houseId || String(req.user.houseId) !== String(house._id)) {
          return res.status(403).json({ message: "Access Denied: You do not belong to this house" });
        }
      }
    }

    next();
  } catch (error) {
    console.error("Tenant Isolation Middleware Error:", error);
    return res.status(500).json({ message: "Internal Server Error checking tenant isolation" });
  }
};
