import rateLimit from "express-rate-limit";

// Rate limiting for sensitive authentication endpoints (Login, Register, Reset Password)
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per window
  message: {
    message: "Too many authentication requests from this IP. Please try again after 15 minutes."
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false // Disable the `X-RateLimit-*` headers
});

// Rate limiting for general API actions
export const apiLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 500, // Limit each IP to 500 requests per 5 minutes
  message: {
    message: "Too many requests from this IP. Please slow down."
  },
  standardHeaders: true,
  legacyHeaders: false
});
