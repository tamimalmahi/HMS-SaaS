import mongoose from "mongoose";
import dns from "node:dns";

// Override DNS servers to use Google Public DNS so that SRV records resolve correctly
try {
  dns.setServers(["8.8.8.8", "8.8.4.4"]);
  console.log("DNS servers overridden to Google Public DNS.");
} catch (dnsErr) {
  console.warn("Failed to override DNS servers, using default system resolver:", dnsErr);
}

// Dynamically import MongoMemoryServer to prevent it from blocking if not needed
export const connectDB = async (): Promise<void> => {
  const atlasURI = process.env.MONGODB_URI;
  const localURI = "mongodb://127.0.0.1:27017/hms_saas";

  // 1. Attempt MongoDB Atlas
  try {
    if (atlasURI) {
      console.log("Attempting to connect to MongoDB Atlas...");
      await mongoose.connect(atlasURI, { serverSelectionTimeoutMS: 5000 });
      console.log("Connected to MongoDB Atlas successfully.");
      return;
    }
  } catch (error) {
    console.warn("MongoDB Atlas connection failed. Trying local MongoDB...");
  }

  // 2. Attempt local MongoDB
  try {
    console.log(`Attempting to connect to local MongoDB at: ${localURI}...`);
    await mongoose.connect(localURI, { serverSelectionTimeoutMS: 3000 });
    console.log("Connected to local MongoDB successfully.");
    return;
  } catch (error) {
    console.warn("Local MongoDB connection failed. Initializing in-memory MongoDB server...");
  }

  // 3. Fallback to In-Memory MongoDB Server (Downloads binary on-the-fly)
  try {
    const { MongoMemoryServer } = require("mongodb-memory-server");
    const mongoServer = await MongoMemoryServer.create();
    const uri = mongoServer.getUri();
    
    console.log(`In-memory MongoDB server started at: ${uri}`);
    await mongoose.connect(uri);
    console.log("Connected to in-memory MongoDB successfully.");
    
    // Handle cleanup on shutdown
    process.on("SIGTERM", async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
      process.exit(0);
    });
    
    process.on("SIGINT", async () => {
      await mongoose.disconnect();
      await mongoServer.stop();
      process.exit(0);
    });

  } catch (error) {
    console.error("Critical: Could not start or connect to in-memory MongoDB server.", error);
    process.exit(1);
  }
};
