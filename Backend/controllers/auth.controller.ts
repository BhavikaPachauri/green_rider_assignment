import type { RequestHandler } from "express";
import bcrypt from "bcrypt";
import { prisma } from "../lib/prisma.js";
import { generateAccessToken, generateRefreshToken } from "../lib/jwt.js";
import jwt from "jsonwebtoken";
import type { Role } from "../generated/prisma/client.js";

const REFRESH_TOKEN_SALT_ROUNDS = 10;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ALLOWED_ROLES: readonly Role[] = ["ADMIN", "MEMBER"] as const;

const sanitizeRole = (value: unknown): Role => {
  if (typeof value === "string") {
    const upper = value.toUpperCase();
    if (ALLOWED_ROLES.includes(upper as Role)) {
      return upper as Role;
    }
  }
  return "MEMBER";
};

const createRefreshTokenSession = async (userId: number) => {
  const refreshToken = generateRefreshToken(userId);
  const refreshTokenHash = await bcrypt.hash(
    refreshToken,
    REFRESH_TOKEN_SALT_ROUNDS,
  );
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

const extractRefreshToken = (body: unknown) => {
  if (typeof body !== "object" || body === null) {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const candidate =
    typeof payload.refreshToken === "string"
      ? payload.refreshToken
      : payload.token;

  return typeof candidate === "string" && candidate.trim()
    ? candidate.trim()
    : null;
};

const publicUser = (user: {
  id: number;
  name: string;
  email: string;
  role: Role;
  createdAt: Date;
}) => ({
  id: user.id,
  name: user.name,
  email: user.email,
  role: user.role,
  createdAt: user.createdAt,
});

export const register: RequestHandler = async (req, res) => {
  const { name, email, password, role } = req.body ?? {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    !name.trim() ||
    !email.trim() ||
    !password.trim()
  ) {
    res
      .status(400)
      .json({ message: "Name, email and password are required" });
    return;
  }

  if (password.length < 6) {
    res
      .status(400)
      .json({ message: "Password must be at least 6 characters" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existingUser = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  if (existingUser) {
    res.status(409).json({ message: "User already exists" });
    return;
  }

  const hashed = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      name: name.trim(),
      email: normalizedEmail,
      password: hashed,
      role: sanitizeRole(role),
    },
  });

  res.status(201).json(publicUser(user));
};

export const login: RequestHandler = async (req, res) => {
  const { email, password } = req.body ?? {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password.trim()
  ) {
    res.status(400).json({ message: "Email and password are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });
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

  res.json({ accessToken, refreshToken, user: publicUser(user) });
};

export const me: RequestHandler = async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      createdAt: true,
    },
  });

  if (!user) {
    res.status(404).json({ message: "User not found" });
    return;
  }

  res.json(user);
};

export const refresh: RequestHandler = async (req, res) => {
  const refreshToken = extractRefreshToken(req.body);

  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    ) as {
      userId: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (
      !user?.refreshTokenHash ||
      !user.refreshTokenExpiry ||
      user.refreshTokenExpiry.getTime() <= Date.now()
    ) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (!tokenMatches) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const accessToken = generateAccessToken(decoded.userId);
    const nextRefreshToken = await createRefreshTokenSession(decoded.userId);

    res.json({
      accessToken,
      refreshToken: nextRefreshToken,
      user: publicUser(user),
    });
    return;
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
    return;
  }
};

export const logout: RequestHandler = async (req, res) => {
  const refreshToken = extractRefreshToken(req.body);

  if (!refreshToken) {
    res.status(400).json({ message: "Refresh token is required" });
    return;
  }

  try {
    const decoded = jwt.verify(
      refreshToken,
      process.env.JWT_REFRESH_SECRET!,
    ) as {
      userId: number;
    };

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user?.refreshTokenHash) {
      res.status(401).json({ message: "Invalid refresh token" });
      return;
    }

    const tokenMatches = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

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
  } catch {
    res.status(401).json({ message: "Invalid refresh token" });
    return;
  }
};
