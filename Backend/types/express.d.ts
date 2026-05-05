import type { Role } from "../generated/prisma/client.js";

declare global {
  namespace Express {
    interface Request {
      userId: number;
      userRole: Role;
    }
  }
}

export {};
