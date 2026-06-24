"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMealStats = exports.toggleMealOff = exports.submitDailyMeals = exports.getMeals = void 0;
const Meal_1 = __importDefault(require("../models/Meal"));
const User_1 = __importDefault(require("../models/User"));
const Expense_1 = __importDefault(require("../models/Expense"));
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
const zod_1 = require("zod");
const dailyMealEntrySchema = zod_1.z.object({
    date: zod_1.z.string().min(1, "Date is required"),
    entries: zod_1.z.array(zod_1.z.object({
        userId: zod_1.z.string().min(1, "userId is required"),
        breakfast: zod_1.z.number().min(0),
        lunch: zod_1.z.number().min(0),
        dinner: zod_1.z.number().min(0),
        isOff: zod_1.z.boolean().optional()
    }))
});
const toggleOffSchema = zod_1.z.object({
    date: zod_1.z.string().min(1, "Date is required"),
    isOff: zod_1.z.boolean()
});
const getMeals = async (req, res, next) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ message: "Month query parameter (YYYY-MM) is required" });
        }
        const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        const meals = await Meal_1.default.find({
            houseId: req.houseId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        }).populate("userId", "name username phone");
        return res.status(200).json(meals);
    }
    catch (error) {
        next(error);
    }
};
exports.getMeals = getMeals;
const submitDailyMeals = async (req, res, next) => {
    try {
        const data = dailyMealEntrySchema.parse(req.body);
        const dateObj = new Date(data.date);
        // Run batch database updates using bulkWrite
        const bulkOps = data.entries.map((entry) => ({
            updateOne: {
                filter: { houseId: req.houseId, userId: entry.userId, date: dateObj },
                update: {
                    $set: {
                        breakfast: entry.breakfast,
                        lunch: entry.lunch,
                        dinner: entry.dinner,
                        isOff: entry.isOff ?? false
                    }
                },
                upsert: true
            }
        }));
        await Meal_1.default.bulkWrite(bulkOps);
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId: req.user._id,
            username: req.user.username,
            action: "MEAL_DAILY_SUBMIT",
            details: `Submitted daily meals for date ${data.date} (${data.entries.length} members)`
        });
        return res.status(200).json({ message: "Meals updated successfully" });
    }
    catch (error) {
        next(error);
    }
};
exports.submitDailyMeals = submitDailyMeals;
const toggleMealOff = async (req, res, next) => {
    try {
        const { date, isOff } = toggleOffSchema.parse(req.body);
        const dateObj = new Date(date);
        const userId = req.user._id;
        // Check if meal entry already exists for user on that day, if not create one with 0 meals
        const meal = await Meal_1.default.findOneAndUpdate({ houseId: req.houseId, userId, date: dateObj }, { $set: { isOff } }, { upsert: true, new: true });
        await AuditLog_1.default.create({
            houseId: req.house._id,
            userId,
            username: req.user.username,
            action: "MEAL_TOGGLE_OFF",
            details: `Toggled meal status on ${date} to: ${isOff ? "OFF" : "ON"}`
        });
        return res.status(200).json({
            message: `Meal successfully toggled ${isOff ? "OFF" : "ON"}`,
            meal
        });
    }
    catch (error) {
        next(error);
    }
};
exports.toggleMealOff = toggleMealOff;
const getMealStats = async (req, res, next) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ message: "Month (YYYY-MM) is required" });
        }
        const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        // Get total meal expense for this month
        const mealExpenses = await Expense_1.default.find({
            houseId: req.houseId,
            category: "meal",
            date: { $gte: startOfMonth, $lt: endOfMonth }
        });
        const totalMealCost = mealExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        // Get all meals for this month
        const meals = await Meal_1.default.find({
            houseId: req.houseId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        });
        // Calculate total meals count
        // Normally breakfast = 0.5, lunch = 1, dinner = 1 (or adjustable, but 0.5, 1, 1 is standard in Bangladesh)
        let totalMealsCount = 0;
        const userMealsMap = {};
        meals.forEach((m) => {
            const userIdStr = String(m.userId);
            if (!userMealsMap[userIdStr]) {
                userMealsMap[userIdStr] = { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
            }
            // If meal is off, we skip adding meals for that day
            if (!m.isOff) {
                const mealPoints = m.breakfast * 0.5 + m.lunch * 1.0 + m.dinner * 1.0;
                userMealsMap[userIdStr].breakfast += m.breakfast;
                userMealsMap[userIdStr].lunch += m.lunch;
                userMealsMap[userIdStr].dinner += m.dinner;
                userMealsMap[userIdStr].total += mealPoints;
                totalMealsCount += mealPoints;
            }
        });
        // Dynamic meal rate
        const mealRate = totalMealsCount > 0 ? totalMealCost / totalMealsCount : 0;
        // Fetch member details
        const members = await User_1.default.find({ houseId: req.houseId }).select("name username");
        const memberBreakdown = members.map((member) => {
            const stats = userMealsMap[String(member._id)] || { breakfast: 0, lunch: 0, dinner: 0, total: 0 };
            return {
                userId: member._id,
                name: member.name,
                username: member.username,
                breakfastCount: stats.breakfast,
                lunchCount: stats.lunch,
                dinnerCount: stats.dinner,
                totalMeals: stats.total,
                calculatedCost: stats.total * mealRate
            };
        });
        return res.status(200).json({
            month,
            totalMealCost,
            totalMealsCount,
            mealRate,
            memberBreakdown
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getMealStats = getMealStats;
