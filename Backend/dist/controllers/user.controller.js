import { prisma } from "../lib/prisma.js";
export const listUsers = async (req, res) => {
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const where = search
        ? {
            OR: [
                { name: { contains: search } },
                { email: { contains: search } },
            ],
        }
        : {};
    const users = await prisma.user.findMany({
        where,
        select: {
            id: true,
            name: true,
            email: true,
            role: true,
            createdAt: true,
        },
        orderBy: { createdAt: "asc" },
        take: 100,
    });
    res.json({ data: users });
};
