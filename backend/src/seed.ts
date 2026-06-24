import mongoose from "mongoose";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import User from "./models/User";
import House from "./models/House";
import { connectDB } from "./config/db";

dotenv.config();

const seed = async () => {
  try {
    // Connect to database (handles Atlas & local fallbacks)
    await connectDB();

    console.log("Connected to MongoDB for seeding...");

    // 1. Create Super Admin
    const existingSuperAdmin = await User.findOne({ role: "super_admin" });
    if (!existingSuperAdmin) {
      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash("SuperAdmin123!", salt);

      await User.create({
        name: "Super Admin",
        email: "admin@hms.com",
        phone: "01700000000",
        username: "superadmin",
        passwordHash,
        role: "super_admin",
        houseId: null,
        status: "active"
      });
      console.log("Super Admin seeded: superadmin / SuperAdmin123!");
    } else {
      console.log("Super Admin already exists.");
    }

    // 2. Create Sample House (Green Villa)
    const existingHouse = await House.findOne({ slug: "green-villa" });
    if (!existingHouse) {
      const house = await House.create({
        name: "Green Villa",
        slug: "green-villa",
        plan: "pro", // Seeding with Pro plan for immediate full testing of WhatsApp and Maintenance
        status: "active",
        branding: {
          primaryColor: "#059669", // emerald green
          secondaryColor: "#10b981"
        },
        settings: {
          dueDate: "25",
          mealRateCalculationMode: "dynamic"
        }
      });

      const salt = await bcrypt.genSalt(12);
      const passwordHash = await bcrypt.hash("AdminPassword123!", salt);

      const adminUser = await User.create({
        name: "Rahim Uddin",
        email: "rahim@greenvilla.com",
        phone: "01711223344",
        username: "greenadmin",
        passwordHash,
        role: "house_admin",
        houseId: house._id,
        status: "active"
      });

      console.log("Sample House (green-villa) seeded successfully!");
      console.log(`House Admin: greenadmin / AdminPassword123!`);
    } else {
      console.log("Sample House (green-villa) already exists.");
    }

    console.log("Database seeding completed.");
    process.exit(0);
  } catch (error) {
    console.error("Seeding Error:", error);
    process.exit(1);
  }
};

seed();
