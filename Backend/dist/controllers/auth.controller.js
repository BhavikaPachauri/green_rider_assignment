import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../lib/jwt.js";
import jwt from "jsonwebtoken";
const REFRESH_TOKEN_SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const createRefreshTokenSession = async (userId) => {
    const refreshToken = generateRefreshToken(userId);
    const refreshTokenHash = await bcrypt.hash(refreshToken, REFRESH_TOKEN_SALT_ROUNDS);
    const refreshTokenExpiry = new Date(Date.now() + REFRESH_TOKEN_TTL_MS);
    await prisma.user.update({
        where: { id: userId },
        data: {
            refreshTokenHash,
            refreshTokenExpiry,
        },
    });
    return refreshToken;
};
const extractRefreshToken = (body) => {
    if (typeof body !== "object" || body === null) {
        return null;
    }
    const payload = body;
    const candidate = typeof payload.refreshToken === "string"
        ? payload.refreshToken
        : payload.token;
    return typeof candidate === "string" && candidate.trim()
        ? candidate.trim()
        : null;
};
export const register = async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password.trim()) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }
    const existingUser = await prisma.user.findUnique({
        where: { email: email.trim().toLowerCase() },
    });
    if (existingUser) {
        res.status(409).json({ message: "User already exists" });
        return;
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
        data: { email: email.trim().toLowerCase(), password: hashed },
    });
    res.status(201).json({
        id: user.id,
        email: user.email,
        createdAt: user.createdAt,
    });
};
export const login = async (req, res) => {
    const { email, password } = req.body;
    if (typeof email !== "string" || typeof password !== "string" || !email.trim() || !password.trim()) {
        res.status(400).json({ message: "Email and password are required" });
        return;
    }
    const normalizedEmail = email.trim().toLowerCase();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
    }
    const accessToken = generateAccessToken(user.id);
    const refreshToken = await createRefreshTokenSession(user.id);
    res.json({ accessToken, refreshToken });
};
export const refresh = async (req, res) => {
    const refreshToken = extractRefreshToken(req.body);
    if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user?.refreshTokenHash ||
            !user.refreshTokenExpiry ||
            user.refreshTokenExpiry.getTime() <= Date.now()) {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }
        const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!tokenMatches) {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }
        const accessToken = generateAccessToken(decoded.userId);
        const nextRefreshToken = await createRefreshTokenSession(decoded.userId);
        res.json({
            accessToken,
            refreshToken: nextRefreshToken,
        });
        return;
    }
    catch {
        res.status(401).json({ message: "Invalid refresh token" });
        return;
    }
};
export const logout = async (req, res) => {
    const refreshToken = extractRefreshToken(req.body);
    if (!refreshToken) {
        res.status(400).json({ message: "Refresh token is required" });
        return;
    }
    try {
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
        const user = await prisma.user.findUnique({
            where: { id: decoded.userId },
        });
        if (!user?.refreshTokenHash) {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }
        const tokenMatches = await bcrypt.compare(refreshToken, user.refreshTokenHash);
        if (!tokenMatches) {
            res.status(401).json({ message: "Invalid refresh token" });
            return;
        }
        await prisma.user.update({
            where: { id: decoded.userId },
            data: {
                refreshTokenHash: null,
                refreshTokenExpiry: null,
            },
        });
        res.json({ message: "Logged out" });
        return;
    }
    catch {
        res.status(401).json({ message: "Invalid refresh token" });
        return;
    }
};
