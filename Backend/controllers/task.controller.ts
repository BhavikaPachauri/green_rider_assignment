import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";
import type { Prisma, TaskStatus } from "../generated/prisma/client.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 12;
const MAX_LIMIT = 100;

const VALID_STATUSES: readonly TaskStatus[] = [
  "TODO",
  "IN_PROGRESS",
  "DONE",
] as const;

const taskInclude = {
  project: { select: { id: true, name: true, ownerId: true } },
  assignee: { select: { id: true, name: true, email: true } },
  creator: { select: { id: true, name: true, email: true } },
} satisfies Prisma.TaskInclude;

const parsePositiveInt = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed <= 0) return fallback;
  return parsed;
};

const parseId = (value: string | string[] | undefined) => {
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed <= 0) return null;
  return parsed;
};

const sanitizeStatus = (value: unknown): TaskStatus | undefined => {
  if (typeof value !== "string") return undefined;
  const upper = value.toUpperCase();
  return VALID_STATUSES.includes(upper as TaskStatus)
    ? (upper as TaskStatus)
    : undefined;
};

const parseDueDate = (value: unknown): Date | null | undefined => {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date;
};

const accessibleProjectIds = async (userId: number, isAdmin: boolean) => {
  if (isAdmin) return null;
  const memberships = await prisma.projectMember.findMany({
    where: { userId },
    select: { projectId: true },
  });
  const owned = await prisma.project.findMany({
    where: { ownerId: userId },
    select: { id: true },
  });
  const ids = new Set<number>([
    ...memberships.map((m) => m.projectId),
    ...owned.map((p) => p.id),
  ]);
  return Array.from(ids);
};

const ensureProjectAccess = async (
  projectId: number,
  userId: number,
  isAdmin: boolean,
) => {
  if (isAdmin) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { id: true, ownerId: true },
    });
    return project;
  }

  const project = await prisma.project.findFirst({
    where: {
      id: projectId,
      OR: [{ ownerId: userId }, { members: { some: { userId } } }],
    },
    select: { id: true, ownerId: true },
  });
  return project;
};

export const listTasks: RequestHandler = async (req, res) => {
  const isAdmin = req.userRole === "ADMIN";
  const page = parsePositiveInt(req.query.page, DEFAULT_PAGE);
  const limit = Math.min(
    parsePositiveInt(req.query.limit, DEFAULT_LIMIT),
    MAX_LIMIT,
  );
  const search =
    typeof req.query.search === "string" ? req.query.search.trim() : "";

  const status = sanitizeStatus(req.query.status);
  const projectIdParam = req.query.projectId
    ? parsePositiveInt(req.query.projectId, 0)
    : 0;
  const assigneeIdParam = req.query.assigneeId
    ? parsePositiveInt(req.query.assigneeId, 0)
    : 0;
  const overdue = req.query.overdue === "true";
  const mine = req.query.mine === "true";

  const where: Prisma.TaskWhereInput = {};

  if (search) {
    where.title = { contains: search };
  }

  if (status) where.status = status;
  if (projectIdParam) where.projectId = projectIdParam;
  if (assigneeIdParam) where.assigneeId = assigneeIdParam;
  if (mine) where.assigneeId = req.userId;

  if (overdue) {
    where.dueDate = { lt: new Date() };
    where.status = where.status ?? { not: "DONE" };
  }

  const allowedProjectIds = await accessibleProjectIds(req.userId, isAdmin);
  if (allowedProjectIds !== null) {
    if (allowedProjectIds.length === 0) {
      res.json({
        data: [],
        pagination: { page, limit, total: 0, totalPages: 1 },
      });
      return;
    }

    if (where.projectId !== undefined) {
      if (!allowedProjectIds.includes(where.projectId as number)) {
        res.status(403).json({ message: "Forbidden" });
        return;
      }
    } else {
      where.projectId = { in: allowedProjectIds };
    }
  }

  const [tasks, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
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

export const getTaskById: RequestHandler = async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) {
    res.status(400).json({ message: "Invalid task id" });
    return;
  }

  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: taskInclude,
  });

  if (!task) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  if (req.userRole !== "ADMIN") {
    const access = await ensureProjectAccess(
      task.projectId,
      req.userId,
      false,
    );
    if (!access) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }

  res.json(task);
};

export const createTask: RequestHandler = async (req, res) => {
  const { title, description, projectId, assigneeId, dueDate, status } =
    req.body ?? {};

  if (typeof title !== "string" || !title.trim()) {
    res.status(400).json({ message: "Title is required" });
    return;
  }

  const projectIdParsed = Number(projectId);
  if (!Number.isInteger(projectIdParsed) || projectIdParsed <= 0) {
    res.status(400).json({ message: "Valid projectId is required" });
    return;
  }

  const access = await ensureProjectAccess(
    projectIdParsed,
    req.userId,
    req.userRole === "ADMIN",
  );
  if (!access) {
    res
      .status(403)
      .json({ message: "You do not have access to this project" });
    return;
  }

  let assigneeIdValue: number | null = null;
  if (assigneeId !== undefined && assigneeId !== null) {
    const parsed = Number(assigneeId);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      res.status(400).json({ message: "Invalid assigneeId" });
      return;
    }
    const assigneeMember = await prisma.projectMember.findUnique({
      where: { projectId_userId: { projectId: projectIdParsed, userId: parsed } },
    });
    const assigneeIsOwner = access.ownerId === parsed;
    if (!assigneeMember && !assigneeIsOwner) {
      res
        .status(400)
        .json({ message: "Assignee must be a member of the project" });
      return;
    }
    assigneeIdValue = parsed;
  }

  const dueDateValue = parseDueDate(dueDate);
  if (dueDateValue === undefined && dueDate !== undefined) {
    res.status(400).json({ message: "Invalid dueDate" });
    return;
  }

  const statusValue = sanitizeStatus(status) ?? "TODO";

  const task = await prisma.task.create({
    data: {
      title: title.trim(),
      description:
        typeof description === "string" && description.trim()
          ? description.trim()
          : null,
      projectId: projectIdParsed,
      assigneeId: assigneeIdValue,
      creatorId: req.userId,
      dueDate: dueDateValue ?? null,
      status: statusValue,
    },
    include: taskInclude,
  });

  res.status(201).json(task);
};

export const updateTask: RequestHandler = async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) {
    res.status(400).json({ message: "Invalid task id" });
    return;
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true } } },
  });

  if (!existing) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  const isAdmin = req.userRole === "ADMIN";
  const isOwner = existing.project.ownerId === req.userId;
  const isAssignee = existing.assigneeId === req.userId;
  const isCreator = existing.creatorId === req.userId;

  if (!isAdmin) {
    const access = await ensureProjectAccess(
      existing.projectId,
      req.userId,
      false,
    );
    if (!access) {
      res.status(403).json({ message: "Forbidden" });
      return;
    }
  }

  const data: Prisma.TaskUpdateInput = {};
  const canEditAll = isAdmin || isOwner || isCreator;

  if ("title" in req.body) {
    if (!canEditAll) {
      res
        .status(403)
        .json({ message: "Only the creator, owner or admin can edit details" });
      return;
    }
    if (
      typeof req.body.title !== "string" ||
      !req.body.title.trim()
    ) {
      res.status(400).json({ message: "Title must be a non-empty string" });
      return;
    }
    data.title = req.body.title.trim();
  }

  if ("description" in req.body) {
    if (!canEditAll) {
      res
        .status(403)
        .json({ message: "Only the creator, owner or admin can edit details" });
      return;
    }
    const raw = req.body.description;
    if (raw === null || raw === "") {
      data.description = null;
    } else if (typeof raw === "string") {
      data.description = raw.trim() || null;
    } else {
      res.status(400).json({ message: "Invalid description" });
      return;
    }
  }

  if ("status" in req.body) {
    if (!canEditAll && !isAssignee) {
      res
        .status(403)
        .json({ message: "Only the assignee or owner can change status" });
      return;
    }
    const next = sanitizeStatus(req.body.status);
    if (!next) {
      res
        .status(400)
        .json({ message: "Status must be TODO, IN_PROGRESS, or DONE" });
      return;
    }
    data.status = next;
  }

  if ("dueDate" in req.body) {
    if (!canEditAll) {
      res
        .status(403)
        .json({ message: "Only the creator, owner or admin can edit details" });
      return;
    }
    const next = parseDueDate(req.body.dueDate);
    if (next === undefined) {
      res.status(400).json({ message: "Invalid dueDate" });
      return;
    }
    data.dueDate = next;
  }

  if ("assigneeId" in req.body) {
    if (!canEditAll) {
      res
        .status(403)
        .json({ message: "Only the creator, owner or admin can re-assign" });
      return;
    }
    const raw = req.body.assigneeId;
    if (raw === null) {
      data.assignee = { disconnect: true };
    } else {
      const parsed = Number(raw);
      if (!Number.isInteger(parsed) || parsed <= 0) {
        res.status(400).json({ message: "Invalid assigneeId" });
        return;
      }
      const assigneeMember = await prisma.projectMember.findUnique({
        where: {
          projectId_userId: { projectId: existing.projectId, userId: parsed },
        },
      });
      const assigneeIsOwner = existing.project.ownerId === parsed;
      if (!assigneeMember && !assigneeIsOwner) {
        res
          .status(400)
          .json({ message: "Assignee must be a member of the project" });
        return;
      }
      data.assignee = { connect: { id: parsed } };
    }
  }

  if (Object.keys(data).length === 0) {
    res.status(400).json({ message: "No valid fields provided" });
    return;
  }

  const updated = await prisma.task.update({
    where: { id: taskId },
    data,
    include: taskInclude,
  });

  res.json(updated);
};

export const deleteTask: RequestHandler = async (req, res) => {
  const taskId = parseId(req.params.id);
  if (!taskId) {
    res.status(400).json({ message: "Invalid task id" });
    return;
  }

  const existing = await prisma.task.findUnique({
    where: { id: taskId },
    include: { project: { select: { ownerId: true } } },
  });

  if (!existing) {
    res.status(404).json({ message: "Task not found" });
    return;
  }

  const isAdmin = req.userRole === "ADMIN";
  const isOwner = existing.project.ownerId === req.userId;
  const isCreator = existing.creatorId === req.userId;

  if (!isAdmin && !isOwner && !isCreator) {
    res
      .status(403)
      .json({ message: "Only the creator, owner or admin can delete" });
    return;
  }

  await prisma.task.delete({ where: { id: taskId } });
  res.json({ message: "Task deleted" });
};
