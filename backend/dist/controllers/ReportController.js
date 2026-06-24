"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportReportPDF = exports.getReportSummary = void 0;
const pdfkit_1 = __importDefault(require("pdfkit"));
const Expense_1 = __importDefault(require("../models/Expense"));
const Meal_1 = __importDefault(require("../models/Meal"));
const User_1 = __importDefault(require("../models/User"));
const Room_1 = __importDefault(require("../models/Room"));
const Notice_1 = __importDefault(require("../models/Notice"));
const getReportSummary = async (req, res, next) => {
    try {
        const { month } = req.query;
        if (!month) {
            return res.status(400).json({ message: "Month (YYYY-MM) is required" });
        }
        const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        // 1. Get Expenses categorized
        const expenses = await Expense_1.default.find({
            houseId: req.houseId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        });
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});
        // 2. Room Occupancy
        const totalRooms = await Room_1.default.countDocuments({ houseId: req.houseId });
        const rooms = await Room_1.default.find({ houseId: req.houseId });
        const totalCapacity = rooms.reduce((sum, r) => sum + r.capacity, 0);
        const totalOccupants = rooms.reduce((sum, r) => sum + r.occupiedBy.length, 0);
        // 3. Meal Statistics
        const meals = await Meal_1.default.find({
            houseId: req.houseId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        });
        let totalMealsCount = 0;
        const userMealsMap = {};
        meals.forEach((m) => {
            if (!m.isOff) {
                const points = m.breakfast * 0.5 + m.lunch * 1.0 + m.dinner * 1.0;
                userMealsMap[String(m.userId)] = (userMealsMap[String(m.userId)] || 0) + points;
                totalMealsCount += points;
            }
        });
        const mealCost = categoryTotals["meal"] || 0;
        const mealRate = totalMealsCount > 0 ? mealCost / totalMealsCount : 0;
        // 4. Notice activities
        const noticeCount = await Notice_1.default.countDocuments({
            houseId: req.houseId,
            createdAt: { $gte: startOfMonth, $lt: endOfMonth }
        });
        return res.status(200).json({
            month,
            financials: {
                totalExpense,
                categoryTotals,
                nonMealExpenses: totalExpense - mealCost
            },
            meals: {
                totalMealsCount,
                mealRate,
                mealCost
            },
            occupancy: {
                totalRooms,
                totalCapacity,
                totalOccupants,
                occupancyRate: totalCapacity > 0 ? (totalOccupants / totalCapacity) * 100 : 0
            },
            activities: {
                noticeCount
            }
        });
    }
    catch (error) {
        next(error);
    }
};
exports.getReportSummary = getReportSummary;
const exportReportPDF = async (req, res, next) => {
    try {
        const { month } = req.query;
        const house = req.house;
        if (house.plan === "free") {
            return res.status(400).json({ message: "PDF Export is only supported in Basic and Pro plans. Please upgrade." });
        }
        if (!month) {
            return res.status(400).json({ message: "Month (YYYY-MM) is required" });
        }
        const startOfMonth = new Date(`${month}-01T00:00:00.000Z`);
        const endOfMonth = new Date(new Date(startOfMonth).setMonth(startOfMonth.getMonth() + 1));
        // Fetch All Data
        const expenses = await Expense_1.default.find({
            houseId: req.houseId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        }).populate("createdBy", "name");
        const meals = await Meal_1.default.find({
            houseId: req.houseId,
            date: { $gte: startOfMonth, $lt: endOfMonth }
        });
        const members = await User_1.default.find({ houseId: req.houseId }).select("name username role");
        // Math Calculations
        const totalExpense = expenses.reduce((sum, e) => sum + e.amount, 0);
        const categoryTotals = expenses.reduce((acc, curr) => {
            acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
            return acc;
        }, {});
        let totalMealsCount = 0;
        const userMealsMap = {};
        meals.forEach((m) => {
            if (!m.isOff) {
                const points = m.breakfast * 0.5 + m.lunch * 1.0 + m.dinner * 1.0;
                userMealsMap[String(m.userId)] = (userMealsMap[String(m.userId)] || 0) + points;
                totalMealsCount += points;
            }
        });
        const mealCost = categoryTotals["meal"] || 0;
        const mealRate = totalMealsCount > 0 ? mealCost / totalMealsCount : 0;
        // Create PDF Document
        const doc = new pdfkit_1.default({ margin: 50 });
        // Set Response Headers
        res.setHeader("Content-Disposition", `attachment; filename="HMS-Report-${house.slug}-${month}.pdf"`);
        res.setHeader("Content-Type", "application/pdf");
        doc.pipe(res);
        // Document header
        doc.fillColor(house.branding.primaryColor || "#0f172a")
            .fontSize(22)
            .text(house.name, { align: "center" });
        doc.fillColor("#64748b")
            .fontSize(10)
            .text(`Multi-Tenant House Management Platform | Plan: ${house.plan.toUpperCase()}`, { align: "center" })
            .moveDown();
        doc.strokeColor("#cbd5e1")
            .lineWidth(1)
            .moveTo(50, 100)
            .lineTo(550, 100)
            .stroke();
        doc.moveDown(2);
        // Title Section
        doc.fillColor("#1e293b")
            .fontSize(16)
            .text(`Monthly Summary Report - ${month}`, { underline: true })
            .moveDown();
        // Financial Summary
        doc.fontSize(12)
            .fillColor("#0f172a")
            .text(`Total Monthly Costs: `, { continued: true })
            .font("Helvetica-Bold")
            .text(`BDT ${totalExpense.toFixed(2)}`)
            .font("Helvetica")
            .moveDown(0.5);
        // Breakdown Table
        doc.fontSize(11)
            .font("Helvetica-Bold")
            .text("Category Breakdown:")
            .font("Helvetica")
            .moveDown(0.2);
        const categories = ["meal", "electricity", "water", "gas", "internet", "maintenance", "other"];
        categories.forEach((cat) => {
            const amount = categoryTotals[cat] || 0;
            doc.fillColor("#475569")
                .text(`  - ${cat.toUpperCase()}: `, { continued: true })
                .font("Helvetica-Bold")
                .text(`BDT ${amount.toFixed(2)}`)
                .font("Helvetica");
        });
        doc.moveDown();
        // Meals calculation details
        doc.fillColor("#0f172a")
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("Meal Metrics Summary")
            .font("Helvetica")
            .fontSize(10)
            .fillColor("#475569")
            .text(`  - Total Meal Cost: BDT ${mealCost.toFixed(2)}`)
            .text(`  - Total Meals Eaten: ${totalMealsCount.toFixed(1)} meals`)
            .text(`  - Calculated Meal Rate: BDT ${mealRate.toFixed(2)} per meal`)
            .moveDown();
        // Individual Member Breakdown Header
        doc.fillColor("#0f172a")
            .fontSize(12)
            .font("Helvetica-Bold")
            .text("Member Cost Summary")
            .font("Helvetica")
            .moveDown(0.5);
        // Member table header
        let y = doc.y;
        doc.fontSize(9)
            .fillColor("#1e293b")
            .font("Helvetica-Bold")
            .text("Member Name", 50, y)
            .text("Meals", 200, y)
            .text("Meal Cost (A)", 280, y)
            .text("Shared Cost (B)", 380, y)
            .text("Total Cost (A+B)", 470, y)
            .font("Helvetica");
        doc.strokeColor("#cbd5e1")
            .lineWidth(0.5)
            .moveTo(50, y + 15)
            .lineTo(550, y + 15)
            .stroke();
        y += 20;
        // Calculate Shared Cost (Expenses other than meals split equally among all members)
        const activeMembersCount = members.length;
        const nonMealCost = totalExpense - mealCost;
        const sharedCostPerMember = activeMembersCount > 0 ? nonMealCost / activeMembersCount : 0;
        // Output members
        members.forEach((member) => {
            const userMeals = userMealsMap[String(member._id)] || 0;
            const individualMealCost = userMeals * mealRate;
            const totalMemberCost = individualMealCost + sharedCostPerMember;
            doc.fillColor("#475569")
                .text(member.name, 50, y)
                .text(userMeals.toFixed(1), 200, y)
                .text(`BDT ${individualMealCost.toFixed(2)}`, 280, y)
                .text(`BDT ${sharedCostPerMember.toFixed(2)}`, 380, y)
                .text(`BDT ${totalMemberCost.toFixed(2)}`, 470, y);
            y += 18;
        });
        doc.end();
    }
    catch (error) {
        next(error);
    }
};
exports.exportReportPDF = exportReportPDF;
