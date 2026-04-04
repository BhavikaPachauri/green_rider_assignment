import { prisma } from "../lib/prisma.js";
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;
const parsePositiveInt = (value, fallback) => {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
        return fallback;
    }
    return parsed;
};
const parseTaskId = (value) => {
    const rawValue = Array.isArray(value) ? value[0] : value;
    const taskId = Number(rawValue);
    if (!Number.isInteger(taskId) || taskId <= 0) {
        return null;
    }
    return taskId;
};
const getOwnedTask = (taskId, userId) => prisma.task.findFirst({
    where: {
        id: taskId,
        userId,
    },
});
export const getTasks = async (req, res) => {
    const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
    const limit = Math.min(parsePositiveInt(req.query.limit, DEFAULT_LIMIT), MAX_LIMIT);
    const search = typeof req.query.search === "string" ? req.query.search.trim() : "";
    const status = req.query.status;
    const normalizedStatus = Array.isArray(status) ? status[0] : status;
    if (normalizedStatus !== undefined &&
        normalizedStatus !== "true" &&
        normalizedStatus !== "false") {
        res.status(400).json({ message: "Status must be either 'true' or 'false'" });
        return;
    }
    const where = {
        userId: req.userId,
        title: { contains: search },
        ...(normalizedStatus !== undefined && {
            completed: normalizedStatus === "true",
        }),
    };
    const [tasks, total] = await Promise.all([
        prisma.task.findMany({
            where,
            orderBy: { createdAt: "desc" },
            skip: (page - 1) * limit,
            take: limit,
        }),
        prisma.task.count({ where }),
    ]);
    res.json({
        data: tasks,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.max(1, Math.ceil(total / limit)),
        },
    });
};
export const getTaskById = async (req, res) => {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
        res.status(400).json({ message: "Invalid task id" });
        return;
    }
    const task = await getOwnedTask(taskId, req.userId);
    if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    res.json(task);
};
export const createTask = async (req, res) => {
    const title = typeof req.body.title === "string" ? req.body.title.trim() : "";
    if (!title) {
        res.status(400).json({ message: "Title is required" });
        return;
    }
    const task = await prisma.task.create({
        data: {
            title,
            userId: req.userId,
        },
    });
    res.status(201).json(task);
};
export const updateTask = async (req, res) => {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
        res.status(400).json({ message: "Invalid task id" });
        return;
    }
    const existingTask = await getOwnedTask(taskId, req.userId);
    if (!existingTask) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    const data = {};
    if ("title" in req.body) {
        if (typeof req.body.title !== "string" || !req.body.title.trim()) {
            res.status(400).json({ message: "Title must be a non-empty string" });
            return;
        }
        data.title = req.body.title.trim();
    }
    if ("completed" in req.body) {
        if (typeof req.body.completed !== "boolean") {
            res.status(400).json({ message: "Completed must be a boolean" });
            return;
        }
        data.completed = req.body.completed;
    }
    if (Object.keys(data).length === 0) {
        res.status(400).json({ message: "No valid fields provided for update" });
        return;
    }
    const task = await prisma.task.update({
        where: { id: taskId },
        data,
    });
    res.json(task);
};
export const deleteTask = async (req, res) => {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
        res.status(400).json({ message: "Invalid task id" });
        return;
    }
    const existingTask = await getOwnedTask(taskId, req.userId);
    if (!existingTask) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    await prisma.task.delete({
        where: { id: taskId },
    });
    res.json({ message: "Deleted" });
};
export const toggleTask = async (req, res) => {
    const taskId = parseTaskId(req.params.id);
    if (!taskId) {
        res.status(400).json({ message: "Invalid task id" });
        return;
    }
    const task = await getOwnedTask(taskId, req.userId);
    if (!task) {
        res.status(404).json({ message: "Task not found" });
        return;
    }
    const updated = await prisma.task.update({
        where: { id: taskId },
        data: { completed: !task.completed },
    });
    res.json(updated);
};
