"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const User_1 = __importDefault(require("./models/User"));
const House_1 = __importDefault(require("./models/House"));
const db_1 = require("./config/db");
dotenv_1.default.config();
const seed = async () => {
    try {
        // Connect to database (handles Atlas & local fallbacks)
        await (0, db_1.connectDB)();
        console.log("Connected to MongoDB for seeding...");
        // 1. Create Super Admin
        const existingSuperAdmin = await User_1.default.findOne({ role: "super_admin" });
        if (!existingSuperAdmin) {
            const salt = await bcryptjs_1.default.genSalt(12);
            const passwordHash = await bcryptjs_1.default.hash("SuperAdmin123!", salt);
            await User_1.default.create({
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
        }
        else {
            console.log("Super Admin already exists.");
        }
        // 2. Create Sample House (Green Villa)
        const existingHouse = await House_1.default.findOne({ slug: "green-villa" });
        if (!existingHouse) {
            const house = await House_1.default.create({
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
            const salt = await bcryptjs_1.default.genSalt(12);
            const passwordHash = await bcryptjs_1.default.hash("AdminPassword123!", salt);
            const adminUser = await User_1.default.create({
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
        }
        else {
            console.log("Sample House (green-villa) already exists.");
        }
        console.log("Database seeding completed.");
        process.exit(0);
    }
    catch (error) {
        console.error("Seeding Error:", error);
        process.exit(1);
    }
};
seed();
