import dotenv from "dotenv";
// Load env before importing other files that rely on process.env
dotenv.config();

import app from "./app";
import { connectDB } from "./config/db";

const PORT = process.env.PORT || 5000;

const startServer = async () => {
  try {
    // Connect to MongoDB Atlas
    await connectDB();

    app.listen(PORT, () => {
      console.log(`HMS Multi-Tenant Backend running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
    });
  } catch (error) {
    console.error("Critical: Failed to start backend server:", error);
    process.exit(1);
  }
};

startServer();
