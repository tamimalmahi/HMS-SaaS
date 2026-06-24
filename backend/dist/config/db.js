"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const node_dns_1 = __importDefault(require("node:dns"));
// Override DNS servers to use Google Public DNS so that SRV records resolve correctly
try {
    node_dns_1.default.setServers(["8.8.8.8", "8.8.4.4"]);
    console.log("DNS servers overridden to Google Public DNS.");
}
catch (dnsErr) {
    console.warn("Failed to override DNS servers, using default system resolver:", dnsErr);
}
// Dynamically import MongoMemoryServer to prevent it from blocking if not needed
const connectDB = async () => {
    const atlasURI = process.env.MONGODB_URI;
    const localURI = "mongodb://127.0.0.1:27017/hms_saas";
    // 1. Attempt MongoDB Atlas
    try {
        if (atlasURI) {
            console.log("Attempting to connect to MongoDB Atlas...");
            await mongoose_1.default.connect(atlasURI, { serverSelectionTimeoutMS: 5000 });
            console.log("Connected to MongoDB Atlas successfully.");
            return;
        }
    }
    catch (error) {
        console.warn("MongoDB Atlas connection failed. Trying local MongoDB...");
    }
    // 2. Attempt local MongoDB
    try {
        console.log(`Attempting to connect to local MongoDB at: ${localURI}...`);
        await mongoose_1.default.connect(localURI, { serverSelectionTimeoutMS: 3000 });
        console.log("Connected to local MongoDB successfully.");
        return;
    }
    catch (error) {
        console.warn("Local MongoDB connection failed. Initializing in-memory MongoDB server...");
    }
    // 3. Fallback to In-Memory MongoDB Server (Downloads binary on-the-fly)
    try {
        const { MongoMemoryServer } = require("mongodb-memory-server");
        const mongoServer = await MongoMemoryServer.create();
        const uri = mongoServer.getUri();
        console.log(`In-memory MongoDB server started at: ${uri}`);
        await mongoose_1.default.connect(uri);
        console.log("Connected to in-memory MongoDB successfully.");
        // Handle cleanup on shutdown
        process.on("SIGTERM", async () => {
            await mongoose_1.default.disconnect();
            await mongoServer.stop();
            process.exit(0);
        });
        process.on("SIGINT", async () => {
            await mongoose_1.default.disconnect();
            await mongoServer.stop();
            process.exit(0);
        });
    }
    catch (error) {
        console.error("Critical: Could not start or connect to in-memory MongoDB server.", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
