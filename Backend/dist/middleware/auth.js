import jwt from "jsonwebtoken";
export const authMiddleware = (req, res, next) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
        res.status(401).json({ message: "Unauthorized" });
        return;
    }
    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
        req.userId = decoded.userId;
        next();
        return;
    }
    catch {
        res.status(401).json({ message: "Invalid token" });
        return;
    }
};
