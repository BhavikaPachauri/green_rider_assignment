import { prisma } from "../lib/prisma.js";
const parseId = (value) => {
    const raw = Array.isArray(value) ? value[0] : value;
    const parsed = Number(raw);
    if (!Number.isInteger(parsed) || parsed <= 0)
        return null;
    return parsed;
};
const projectInclude = {
    owner: { select: { id: true, name: true, email: true, role: true } },
    members: {
        include: {
            user: { select: { id: true, name: true, email: true, role: true } },
        },
    },
    _count: { select: { tasks: true, members: true } },
};
const isOwnerOrAdmin = (project, userId, role) => project.ownerId === userId || role === "ADMIN";
const userHasAccess = async (projectId, userId) => {
    const member = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId } },
    });
    if (member)
        return true;
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    });
    return project?.ownerId === userId;
};
export const listProjects = async (req, res) => {
    const userId = req.userId;
    const role = req.userRole;
    const projects = await prisma.project.findMany({
        where: role === "ADMIN"
            ? {}
            : {
                OR: [
                    { ownerId: userId },
                    { members: { some: { userId } } },
                ],
            },
        include: projectInclude,
        orderBy: { createdAt: "desc" },
    });
    res.json({ data: projects });
};
export const getProjectById = async (req, res) => {
    const projectId = parseId(req.params.id);
    if (!projectId) {
        res.status(400).json({ message: "Invalid project id" });
        return;
    }
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: projectInclude,
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    if (req.userRole !== "ADMIN") {
        const allowed = await userHasAccess(projectId, req.userId);
        if (!allowed) {
            res.status(403).json({ message: "Forbidden" });
            return;
        }
    }
    res.json(project);
};
export const createProject = async (req, res) => {
    const { name, description } = req.body ?? {};
    if (typeof name !== "string" || !name.trim()) {
        res.status(400).json({ message: "Project name is required" });
        return;
    }
    const project = await prisma.project.create({
        data: {
            name: name.trim(),
            description: typeof description === "string" && description.trim()
                ? description.trim()
                : null,
            ownerId: req.userId,
            members: {
                create: { userId: req.userId },
            },
        },
        include: projectInclude,
    });
    res.status(201).json(project);
};
export const updateProject = async (req, res) => {
    const projectId = parseId(req.params.id);
    if (!projectId) {
        res.status(400).json({ message: "Invalid project id" });
        return;
    }
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    if (!isOwnerOrAdmin(project, req.userId, req.userRole)) {
        res
            .status(403)
            .json({ message: "Only the project owner or an admin can update this" });
        return;
    }
    const data = {};
    if ("name" in req.body) {
        if (typeof req.body.name !== "string" || !req.body.name.trim()) {
            res.status(400).json({ message: "Name must be a non-empty string" });
            return;
        }
        data.name = req.body.name.trim();
    }
    if ("description" in req.body) {
        const raw = req.body.description;
        if (raw === null) {
            data.description = null;
        }
        else if (typeof raw === "string") {
            data.description = raw.trim() || null;
        }
        else {
            res
                .status(400)
                .json({ message: "Description must be a string or null" });
            return;
        }
    }
    if (Object.keys(data).length === 0) {
        res.status(400).json({ message: "No valid fields provided" });
        return;
    }
    const updated = await prisma.project.update({
        where: { id: projectId },
        data,
        include: projectInclude,
    });
    res.json(updated);
};
export const deleteProject = async (req, res) => {
    const projectId = parseId(req.params.id);
    if (!projectId) {
        res.status(400).json({ message: "Invalid project id" });
        return;
    }
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    if (!isOwnerOrAdmin(project, req.userId, req.userRole)) {
        res
            .status(403)
            .json({ message: "Only the project owner or an admin can delete this" });
        return;
    }
    await prisma.project.delete({ where: { id: projectId } });
    res.json({ message: "Project deleted" });
};
export const addMember = async (req, res) => {
    const projectId = parseId(req.params.id);
    if (!projectId) {
        res.status(400).json({ message: "Invalid project id" });
        return;
    }
    const { userId, email } = req.body ?? {};
    let memberId = null;
    if (typeof userId === "number" && Number.isInteger(userId) && userId > 0) {
        memberId = userId;
    }
    else if (typeof email === "string" && email.trim()) {
        const user = await prisma.user.findUnique({
            where: { email: email.trim().toLowerCase() },
            select: { id: true },
        });
        if (!user) {
            res.status(404).json({ message: "User with that email not found" });
            return;
        }
        memberId = user.id;
    }
    if (!memberId) {
        res
            .status(400)
            .json({ message: "Provide a userId or email to add a member" });
        return;
    }
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    if (!isOwnerOrAdmin(project, req.userId, req.userRole)) {
        res
            .status(403)
            .json({ message: "Only the project owner or an admin can add members" });
        return;
    }
    const existing = await prisma.projectMember.findUnique({
        where: { projectId_userId: { projectId, userId: memberId } },
    });
    if (existing) {
        res.status(409).json({ message: "User is already a project member" });
        return;
    }
    await prisma.projectMember.create({
        data: { projectId, userId: memberId },
    });
    const updated = await prisma.project.findUnique({
        where: { id: projectId },
        include: projectInclude,
    });
    res.status(201).json(updated);
};
export const removeMember = async (req, res) => {
    const projectId = parseId(req.params.id);
    const memberId = parseId(req.params.userId);
    if (!projectId || !memberId) {
        res.status(400).json({ message: "Invalid id" });
        return;
    }
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { ownerId: true },
    });
    if (!project) {
        res.status(404).json({ message: "Project not found" });
        return;
    }
    if (!isOwnerOrAdmin(project, req.userId, req.userRole)) {
        res
            .status(403)
            .json({ message: "Only the owner or an admin can remove members" });
        return;
    }
    if (memberId === project.ownerId) {
        res.status(400).json({ message: "The project owner cannot be removed" });
        return;
    }
    await prisma.projectMember.deleteMany({
        where: { projectId, userId: memberId },
    });
    res.json({ message: "Member removed" });
};
