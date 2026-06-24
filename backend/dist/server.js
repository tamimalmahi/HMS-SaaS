"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load env before importing other files that rely on process.env
dotenv_1.default.config();
const app_1 = __importDefault(require("./app"));
const db_1 = require("./config/db");
const PORT = process.env.PORT || 5000;
const startServer = async () => {
    try {
        // Connect to MongoDB Atlas
        await (0, db_1.connectDB)();
        app_1.default.listen(PORT, () => {
            console.log(`HMS Multi-Tenant Backend running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
        });
    }
    catch (error) {
        console.error("Critical: Failed to start backend server:", error);
        process.exit(1);
    }
};
startServer();
