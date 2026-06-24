"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    // Log detailed error on the server
    console.error("Global Error Caught:");
    console.error(err);
    // Default response values
    let statusCode = 500;
    let message = "An internal server error occurred. Please try again later.";
    // Multer limit checks
    if (err.code === "LIMIT_FILE_SIZE") {
        statusCode = 400;
        message = "File is too large. Maximum size allowed is 5 MB.";
    }
    // Zod validation errors
    if (err.name === "ZodError" || err.issues) {
        statusCode = 400;
        return res.status(statusCode).json({
            message: "Validation Error",
            errors: err.errors || err.issues
        });
    }
    // MongoDB CastError or ValidationError
    if (err.name === "CastError") {
        statusCode = 400;
        message = "Resource not found or invalid format";
    }
    if (err.name === "ValidationError") {
        statusCode = 400;
        message = err.message;
    }
    // Handle custom thrown errors
    if (err.statusCode) {
        statusCode = err.statusCode;
        message = err.message;
    }
    // Return generic error message to client
    res.status(statusCode).json({
        message
    });
};
exports.errorHandler = errorHandler;
