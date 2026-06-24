"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_mongo_sanitize_1 = __importDefault(require("express-mongo-sanitize"));
const path_1 = __importDefault(require("path"));
// Import Controllers & Middlewares
const authController = __importStar(require("./controllers/AuthController"));
const houseController = __importStar(require("./controllers/HouseController"));
const roomController = __importStar(require("./controllers/RoomController"));
const memberController = __importStar(require("./controllers/MemberController"));
const expenseController = __importStar(require("./controllers/ExpenseController"));
const mealController = __importStar(require("./controllers/MealController"));
const noticeController = __importStar(require("./controllers/NoticeController"));
const ticketController = __importStar(require("./controllers/MaintenanceTicketController"));
const reportController = __importStar(require("./controllers/ReportController"));
const whatsappController = __importStar(require("./controllers/WhatsAppController"));
const adminController = __importStar(require("./controllers/AdminController"));
const auth_1 = require("./middleware/auth");
const tenant_1 = require("./middleware/tenant");
const error_1 = require("./middleware/error");
const security_1 = require("./middleware/security");
const upload_1 = require("./middleware/upload");
const app = (0, express_1.default)();
// 1. Basic Security Configuration
app.use((0, helmet_1.default)({
    crossOriginResourcePolicy: { policy: "cross-origin" }
}));
const allowedOrigins = [
    "http://localhost:5173", // Local dev frontend
    "https://hms-saas-frontend.vercel.app" // Production placeholder
];
app.use((0, cors_1.default)({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        }
        else {
            callback(new Error("Not allowed by CORS policy"));
        }
    },
    credentials: true
}));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.use((0, express_mongo_sanitize_1.default)());
app.use((req, _res, next) => {
    req.cookies = Object.fromEntries((req.headers.cookie || "")
        .split(";")
        .map((cookie) => cookie.trim())
        .filter(Boolean)
        .map((cookie) => {
        const [rawName, ...rawValue] = cookie.split("=");
        return [decodeURIComponent(rawName), decodeURIComponent(rawValue.join("="))];
    }));
    next();
});
// 2. Static uploads directory to serve files in local fallback mode
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
// 3. Rate Limiters
app.use("/api/", security_1.apiLimiter);
app.use("/api/auth/login", security_1.authLimiter);
app.use("/api/auth/register", security_1.authLimiter);
// 4. Public House Settings (Branding retrieval before login)
app.get("/api/public/house/:houseSlug", houseController.getBrandingAndSettings);
// 5. Auth Routes
app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);
app.post("/api/auth/logout", auth_1.authenticate, authController.logout);
app.post("/api/auth/refresh-token", authController.refreshToken);
// 6. Tenant Isolated Routes (Pre-fixed with house slug)
const tenantRouter = express_1.default.Router({ mergeParams: true });
tenantRouter.use(auth_1.authenticate);
tenantRouter.use(tenant_1.tenantIsolation);
// Branding & Settings (Admin only write)
tenantRouter.put("/branding", (0, auth_1.authorize)(["house_admin"]), houseController.updateBranding);
tenantRouter.put("/settings", (0, auth_1.authorize)(["house_admin"]), houseController.updateSettings);
tenantRouter.post("/media/:imageType", (0, auth_1.authorize)(["house_admin"]), upload_1.singleUpload, houseController.uploadBrandingImages);
// Rooms
tenantRouter.get("/rooms", roomController.getRooms);
tenantRouter.post("/rooms", (0, auth_1.authorize)(["house_admin"]), roomController.createRoom);
tenantRouter.put("/rooms/:id", (0, auth_1.authorize)(["house_admin"]), roomController.updateRoom);
tenantRouter.delete("/rooms/:id", (0, auth_1.authorize)(["house_admin"]), roomController.deleteRoom);
tenantRouter.post("/rooms/:id/assign", (0, auth_1.authorize)(["house_admin"]), roomController.assignMembers);
// Members
tenantRouter.get("/members", memberController.getMembers);
tenantRouter.post("/members", (0, auth_1.authorize)(["house_admin"]), memberController.addMember);
tenantRouter.put("/members/:id", (0, auth_1.authorize)(["house_admin"]), memberController.updateMember);
tenantRouter.delete("/members/:id", (0, auth_1.authorize)(["house_admin"]), memberController.deleteMember);
// Expenses
tenantRouter.get("/expenses", expenseController.getExpenses);
tenantRouter.post("/expenses", (0, auth_1.authorize)(["house_admin", "assistant_admin"]), upload_1.singleUpload, expenseController.createExpense);
tenantRouter.put("/expenses/:id", (0, auth_1.authorize)(["house_admin", "assistant_admin"]), upload_1.singleUpload, expenseController.updateExpense);
tenantRouter.delete("/expenses/:id", (0, auth_1.authorize)(["house_admin"]), expenseController.deleteExpense);
// Meals
tenantRouter.get("/meals", mealController.getMeals);
tenantRouter.post("/meals/daily", (0, auth_1.authorize)(["house_admin", "assistant_admin"]), mealController.submitDailyMeals);
tenantRouter.put("/meals/toggle-off", (0, auth_1.authorize)(["member", "house_admin", "assistant_admin"]), mealController.toggleMealOff);
tenantRouter.get("/meals/stats", mealController.getMealStats);
// Notices
tenantRouter.get("/notices", noticeController.getNotices);
tenantRouter.post("/notices", (0, auth_1.authorize)(["house_admin", "assistant_admin"]), upload_1.singleUpload, noticeController.createNotice);
tenantRouter.put("/notices/:id", (0, auth_1.authorize)(["house_admin", "assistant_admin"]), upload_1.singleUpload, noticeController.updateNotice);
tenantRouter.delete("/notices/:id", (0, auth_1.authorize)(["house_admin"]), noticeController.deleteNotice);
// Maintenance Tickets
tenantRouter.get("/tickets", ticketController.getTickets);
tenantRouter.post("/tickets", (0, auth_1.authorize)(["member", "house_admin", "assistant_admin"]), upload_1.singleUpload, ticketController.createTicket);
tenantRouter.put("/tickets/:id/status", (0, auth_1.authorize)(["house_admin", "assistant_admin"]), ticketController.updateTicketStatus);
// Reports
tenantRouter.get("/reports/summary", reportController.getReportSummary);
tenantRouter.get("/reports/export", reportController.exportReportPDF);
// WhatsApp Broadcasting
tenantRouter.post("/whatsapp/broadcast", (0, auth_1.authorize)(["house_admin"]), whatsappController.generateBroadcastLink);
tenantRouter.get("/whatsapp/logs", (0, auth_1.authorize)(["house_admin"]), whatsappController.getBroadcastLogs);
app.use("/api/houses/:houseSlug", tenantRouter);
// 7. Global Platform Admin Routes
const adminRouter = express_1.default.Router();
adminRouter.use(auth_1.authenticate);
adminRouter.use((0, auth_1.authorize)(["super_admin", "ops_moderator", "support_moderator", "finance_moderator"]));
adminRouter.get("/houses", adminController.getHouses);
adminRouter.put("/houses/:id/status", (0, auth_1.authorize)(["super_admin", "ops_moderator"]), adminController.updateHouseStatus);
adminRouter.put("/houses/:id/plan", (0, auth_1.authorize)(["super_admin", "finance_moderator"]), adminController.updateHousePlan);
adminRouter.get("/analytics", (0, auth_1.authorize)(["super_admin", "finance_moderator", "ops_moderator"]), adminController.getSystemAnalytics);
adminRouter.get("/audit-logs", (0, auth_1.authorize)(["super_admin"]), adminController.getPlatformAuditLogs);
app.use("/api/admin", adminRouter);
// 8. Global Error Handler
app.use(error_1.errorHandler);
exports.default = app;
