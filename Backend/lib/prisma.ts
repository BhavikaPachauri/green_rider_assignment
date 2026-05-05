import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../generated/prisma/client.js";

type AdapterConfig = {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
  connectionLimit: number;
};

const parseDatabaseUrl = (raw: string | undefined): AdapterConfig | null => {
  if (!raw) return null;
  try {
    const url = new URL(raw);
    return {
      host: url.hostname,
      port: Number(url.port) || 3306,
      user: decodeURIComponent(url.username),
      password: decodeURIComponent(url.password),
      database: url.pathname.replace(/^\//, ""),
      connectionLimit: 5,
    };
  } catch {
    return null;
  }
};

const fromEnv = (): AdapterConfig => {
  const port = Number(process.env.DATABASE_PORT || 3306);
  return {
    host: process.env.DATABASE_HOST ?? "localhost",
    port: Number.isNaN(port) ? 3306 : port,
    user: process.env.DATABASE_USER ?? "root",
    password: process.env.DATABASE_PASSWORD ?? "",
    database: process.env.DATABASE_NAME ?? "earnest",
    connectionLimit: 5,
  };
};

const config = parseDatabaseUrl(process.env.DATABASE_URL) ?? fromEnv();

const adapter = new PrismaMariaDb(config);
const prisma = new PrismaClient({ adapter });

export { prisma };
