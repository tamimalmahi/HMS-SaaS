import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User, { IUser } from "../models/User";

interface TokenPayload {
  userId: string;
  role: string;
}

const getJwtSecret = (name: "JWT_ACCESS_SECRET" | "JWT_REFRESH_SECRET", fallback: string) => {
  const secret = process.env[name];
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error(`${name} is required in production`);
  }

  return secret || fallback;
};

export const authenticate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "Authentication required: Missing Bearer Token" });
    }

    const token = authHeader.split(" ")[1];
    const secret = getJwtSecret("JWT_ACCESS_SECRET", "development_access_secret_change_me");
    
    let decoded: TokenPayload;
    try {
      decoded = jwt.verify(token, secret) as TokenPayload;
    } catch (err) {
      return res.status(401).json({ message: "Invalid or expired access token" });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "User account no longer exists" });
    }

    if (user.status === "suspended") {
      return res.status(403).json({ message: "Your account is suspended. Please contact support." });
    }

    // Assign user to request context
    req.user = user;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({ message: "Internal Server Error during authentication" });
  }
};

export const authorize = (allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Forbidden: Access restricted. Required roles: [${allowedRoles.join(", ")}], Your role: ${req.user.role}` 
      });
    }

    next();
  };
};
