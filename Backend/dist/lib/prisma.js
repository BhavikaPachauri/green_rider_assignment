import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";
const parseBoolean = (value) => {
    if (!value)
        return false;
    return ["1", "true", "yes", "require", "required"].includes(value.trim().toLowerCase());
};
const sslConfig = () => {
    if (!parseBoolean(process.env.DATABASE_SSL)) {
        return undefined;
    }
    const ca = process.env.DATABASE_SSL_CA?.replace(/\\n/g, "\n");
    return {
        ...(ca ? { ca } : {}),
        rejectUnauthorized: !parseBoolean(process.env.DATABASE_SSL_ALLOW_UNAUTHORIZED),
    };
};
const parsePositiveNumber = (value, fallback) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};
const timeoutConfig = () => ({
    connectTimeout: parsePositiveNumber(process.env.DATABASE_CONNECT_TIMEOUT_MS, 10000),
    acquireTimeout: parsePositiveNumber(process.env.DATABASE_ACQUIRE_TIMEOUT_MS, 30000),
});
const parseDatabaseUrl = (raw) => {
    if (!raw)
        return null;
    try {
        const url = new URL(raw);
        return {
            host: url.hostname,
            port: Number(url.port) || 3306,
            user: decodeURIComponent(url.username),
            password: decodeURIComponent(url.password),
            database: url.pathname.replace(/^\//, ""),
            connectionLimit: 5,
            ...timeoutConfig(),
            ssl: sslConfig(),
        };
    }
    catch {
        return null;
    }
};
const fromEnv = () => {
    const port = Number(process.env.DATABASE_PORT || 3306);
    return {
        host: process.env.DATABASE_HOST ?? "localhost",
        port: Number.isNaN(port) ? 3306 : port,
        user: process.env.DATABASE_USER ?? "root",
        password: process.env.DATABASE_PASSWORD ?? "",
        database: process.env.DATABASE_NAME ?? "Green Rider",
        connectionLimit: 5,
        ...timeoutConfig(),
        ssl: sslConfig(),
    };
};
const config = parseDatabaseUrl(process.env.DATABASE_URL) ?? fromEnv();
const adapter = new PrismaMariaDb(config);
const prisma = new PrismaClient({ adapter });
export { prisma };
