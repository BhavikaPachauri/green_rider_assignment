import type { RequestHandler } from "express";
import { prisma } from "../lib/prisma.js";

export const getDashboardSummary: RequestHandler = async (req, res) => {
  const isAdmin = req.userRole === "ADMIN";
  const userId = req.userId;
  const now = new Date();

  let projectIds: number[] | null = null;
  if (!isAdmin) {
    const memberships = await prisma.projectMember.findMany({
      where: { userId },
      select: { projectId: true },
    });
    const owned = await prisma.project.findMany({
      where: { ownerId: userId },
      select: { id: true },
    });
    projectIds = Array.from(
      new Set([
        ...memberships.map((m:any) => m.projectId),
        ...owned.map((p:any) => p.id),
      ]),
    );
  }

  const taskWhere = projectIds === null ? {} : { projectId: { in: projectIds } };

  const [
    totalProjects,
    totalTasks,
    todoCount,
    inProgressCount,
    doneCount,
    overdueCount,
    myAssignedCount,
    upcomingTasks,
    teamMemberCount,
  ] = await Promise.all([
    projectIds === null
      ? prisma.project.count()
      : prisma.project.count({
          where: { id: { in: projectIds.length ? projectIds : [-1] } },
        }),
    prisma.task.count({ where: taskWhere }),
    prisma.task.count({ where: { ...taskWhere, status: "TODO" } }),
    prisma.task.count({ where: { ...taskWhere, status: "IN_PROGRESS" } }),
    prisma.task.count({ where: { ...taskWhere, status: "DONE" } }),
    prisma.task.count({
      where: {
        ...taskWhere,
        dueDate: { lt: now },
        status: { not: "DONE" },
      },
    }),
    prisma.task.count({
      where: { ...taskWhere, assigneeId: userId, status: { not: "DONE" } },
    }),
    prisma.task.findMany({
      where: {
        ...taskWhere,
        status: { not: "DONE" },
        dueDate: { not: null },
      },
      include: {
        project: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 5,
    }),
    isAdmin ? prisma.user.count() : Promise.resolve(0),
  ]);

  res.json({
    totals: {
      projects: totalProjects,
      tasks: totalTasks,
      todo: todoCount,
      inProgress: inProgressCount,
      done: doneCount,
      overdue: overdueCount,
      myAssignedOpen: myAssignedCount,
      teamMembers: teamMemberCount,
    },
    upcomingTasks,
  });
};
