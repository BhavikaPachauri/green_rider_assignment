import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma.js";
export const authMiddleware = async (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
            select: { id: true, role: true },
        });
        if (!user) {
            res.status(401).json({ message: "Invalid token" });
            return;
        }
        req.userId = user.id;
        req.userRole = user.role;
        next();
        return;
    }
    catch {
        res.status(401).json({ message: "Invalid token" });
        return;
    }
};
export const requireRole = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.userRole)) {
            res.status(403).json({ message: "Forbidden: insufficient role" });
            return;
        }
        next();
    };
};
