import express from "express";
import cors from "cors";
import helmet from "helmet";
import mongoSanitize from "express-mongo-sanitize";
import path from "path";

// Import Controllers & Middlewares
import * as authController from "./controllers/AuthController";
import * as houseController from "./controllers/HouseController";
import * as roomController from "./controllers/RoomController";
import * as memberController from "./controllers/MemberController";
import * as expenseController from "./controllers/ExpenseController";
import * as mealController from "./controllers/MealController";
import * as noticeController from "./controllers/NoticeController";
import * as ticketController from "./controllers/MaintenanceTicketController";
import * as reportController from "./controllers/ReportController";
import * as whatsappController from "./controllers/WhatsAppController";
import * as adminController from "./controllers/AdminController";

import { authenticate, authorize } from "./middleware/auth";
import { tenantIsolation } from "./middleware/tenant";
import { errorHandler } from "./middleware/error";
import { authLimiter, apiLimiter } from "./middleware/security";
import { singleUpload } from "./middleware/upload";

const app = express();

// 1. Basic Security Configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

const allowedOrigins = [
  "http://localhost:5173", // Local dev frontend
  process.env.CLIENT_URL || "" // Production placeholder
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS policy"));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(mongoSanitize());
app.use((req, _res, next) => {
  req.cookies = Object.fromEntries(
    (req.headers.cookie || "")
      .split(";")
      .map((cookie) => cookie.trim())
      .filter(Boolean)
      .map((cookie) => {
        const [rawName, ...rawValue] = cookie.split("=");
        return [decodeURIComponent(rawName), decodeURIComponent(rawValue.join("="))];
      })
  );
  next();
});

// 2. Static uploads directory to serve files in local fallback mode
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// 3. Rate Limiters
app.use("/api/", apiLimiter);
app.use("/api/auth/login", authLimiter);
app.use("/api/auth/register", authLimiter);

// 4. Public House Settings (Branding retrieval before login)
app.get("/api/public/house/:houseSlug", houseController.getBrandingAndSettings);

// 5. Auth Routes
app.post("/api/auth/register", authController.register);
app.post("/api/auth/login", authController.login);
app.post("/api/auth/logout", authenticate, authController.logout);
app.post("/api/auth/refresh-token", authController.refreshToken);

// 6. Tenant Isolated Routes (Pre-fixed with house slug)
const tenantRouter = express.Router({ mergeParams: true });
tenantRouter.use(authenticate);
tenantRouter.use(tenantIsolation);

// Branding & Settings (Admin only write)
tenantRouter.put("/branding", authorize(["house_admin"]), houseController.updateBranding);
tenantRouter.put("/settings", authorize(["house_admin"]), houseController.updateSettings);
tenantRouter.post("/media/:imageType", authorize(["house_admin"]), singleUpload, houseController.uploadBrandingImages);

// Rooms
tenantRouter.get("/rooms", roomController.getRooms);
tenantRouter.post("/rooms", authorize(["house_admin"]), roomController.createRoom);
tenantRouter.put("/rooms/:id", authorize(["house_admin"]), roomController.updateRoom);
tenantRouter.delete("/rooms/:id", authorize(["house_admin"]), roomController.deleteRoom);
tenantRouter.post("/rooms/:id/assign", authorize(["house_admin"]), roomController.assignMembers);

// Members
tenantRouter.get("/members", memberController.getMembers);
tenantRouter.post("/members", authorize(["house_admin"]), memberController.addMember);
tenantRouter.put("/members/:id", authorize(["house_admin"]), memberController.updateMember);
tenantRouter.delete("/members/:id", authorize(["house_admin"]), memberController.deleteMember);

// Expenses
tenantRouter.get("/expenses", expenseController.getExpenses);
tenantRouter.post("/expenses", authorize(["house_admin", "assistant_admin"]), singleUpload, expenseController.createExpense);
tenantRouter.put("/expenses/:id", authorize(["house_admin", "assistant_admin"]), singleUpload, expenseController.updateExpense);
tenantRouter.delete("/expenses/:id", authorize(["house_admin"]), expenseController.deleteExpense);

// Meals
tenantRouter.get("/meals", mealController.getMeals);
tenantRouter.post("/meals/daily", authorize(["house_admin", "assistant_admin"]), mealController.submitDailyMeals);
tenantRouter.put("/meals/toggle-off", authorize(["member", "house_admin", "assistant_admin"]), mealController.toggleMealOff);
tenantRouter.get("/meals/stats", mealController.getMealStats);

// Notices
tenantRouter.get("/notices", noticeController.getNotices);
tenantRouter.post("/notices", authorize(["house_admin", "assistant_admin"]), singleUpload, noticeController.createNotice);
tenantRouter.put("/notices/:id", authorize(["house_admin", "assistant_admin"]), singleUpload, noticeController.updateNotice);
tenantRouter.delete("/notices/:id", authorize(["house_admin"]), noticeController.deleteNotice);

// Maintenance Tickets
tenantRouter.get("/tickets", ticketController.getTickets);
tenantRouter.post("/tickets", authorize(["member", "house_admin", "assistant_admin"]), singleUpload, ticketController.createTicket);
tenantRouter.put("/tickets/:id/status", authorize(["house_admin", "assistant_admin"]), ticketController.updateTicketStatus);

// Reports
tenantRouter.get("/reports/summary", reportController.getReportSummary);
tenantRouter.get("/reports/export", reportController.exportReportPDF);

// WhatsApp Broadcasting
tenantRouter.post("/whatsapp/broadcast", authorize(["house_admin"]), whatsappController.generateBroadcastLink);
tenantRouter.get("/whatsapp/logs", authorize(["house_admin"]), whatsappController.getBroadcastLogs);

app.use("/api/houses/:houseSlug", tenantRouter);

// 7. Global Platform Admin Routes
const adminRouter = express.Router();
adminRouter.use(authenticate);
adminRouter.use(authorize(["super_admin", "ops_moderator", "support_moderator", "finance_moderator"]));

adminRouter.get("/houses", adminController.getHouses);
adminRouter.put("/houses/:id/status", authorize(["super_admin", "ops_moderator"]), adminController.updateHouseStatus);
adminRouter.put("/houses/:id/plan", authorize(["super_admin", "finance_moderator"]), adminController.updateHousePlan);
adminRouter.get("/analytics", authorize(["super_admin", "finance_moderator", "ops_moderator"]), adminController.getSystemAnalytics);
adminRouter.get("/audit-logs", authorize(["super_admin"]), adminController.getPlatformAuditLogs);

app.use("/api/admin", adminRouter);

// 8. Global Error Handler
app.use(errorHandler);

export default app;
