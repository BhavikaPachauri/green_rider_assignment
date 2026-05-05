"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { DashboardSummary } from "@/types/api";

const formatDueDate = (value: string | null) => {
  if (!value) return "No due date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Invalid date";
  return date.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

const isOverdue = (value: string | null) => {
  if (!value) return false;
  const date = new Date(value);
  return date.getTime() < Date.now();
};

const STATUS_LABEL: Record<string, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

export default function OverviewView({
  reloadKey,
}: {
  reloadKey: number;
}) {
  const { authorizedRequest, session } = useAuth();
  const { showToast } = useToast();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    authorizedRequest<DashboardSummary>("/dashboard/summary")
      .then((data) => {
        if (!cancelled) setSummary(data);
      })
      .catch((error) => {
        if (cancelled) return;
        showToast(
          error instanceof Error ? error.message : "Could not load summary.",
          "error",
        );
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authorizedRequest, reloadKey, showToast]);

  const isAdmin = session?.user.role === "ADMIN";

  const cards: Array<[string, number | string, string, string]> = summary
    ? [
        [
          "Projects",
          summary.totals.projects,
          isAdmin ? "All workspace projects" : "Projects you can access",
          "bg-accent/10 text-accent",
        ],
        [
          "Open tasks",
          summary.totals.todo + summary.totals.inProgress,
          `${summary.totals.todo} to do · ${summary.totals.inProgress} in progress`,
          "bg-accent-secondary/10 text-accent-secondary",
        ],
        [
          "Done",
          summary.totals.done,
          "Completed across your projects",
          "bg-success/10 text-success",
        ],
        [
          "Overdue",
          summary.totals.overdue,
          "Past due and not finished",
          "bg-danger/10 text-danger",
        ],
        [
          "Assigned to me",
          summary.totals.myAssignedOpen,
          "Open tasks assigned to your account",
          "bg-foreground/10 text-foreground",
        ],
        isAdmin
          ? [
              "Team members",
              summary.totals.teamMembers,
              "All registered users",
              "bg-accent/10 text-accent",
            ]
          : [
              "Your role",
              session?.user.role ?? "MEMBER",
              "Account access level",
              "bg-accent/10 text-accent",
            ],
      ]
    : [];

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="soft-panel animate-pulse rounded-[1.75rem] p-6"
            >
              <div className="h-4 w-24 rounded-full bg-foreground/10" />
              <div className="mt-4 h-10 w-16 rounded-full bg-foreground/10" />
              <div className="mt-3 h-4 w-3/4 rounded-full bg-foreground/10" />
            </div>
          ))
        ) : summary ? (
          cards.map(([label, value, body, tone]) => (
            <div
              key={label}
              className="soft-panel card-hover rounded-[1.75rem] p-6"
            >
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${tone}`}
              >
                {label}
              </span>
              <p className="display-font mt-4 text-5xl font-semibold">
                {value}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
            </div>
          ))
        ) : null}
      </div>

      <div className="glass-panel rounded-[2rem] p-6">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="display-font text-2xl font-semibold">
              Upcoming tasks
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Next five open tasks ordered by due date.
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse rounded-2xl border border-line bg-white/60 p-4"
              >
                <div className="h-4 w-1/3 rounded-full bg-foreground/10" />
                <div className="mt-3 h-3 w-1/2 rounded-full bg-foreground/10" />
              </div>
            ))
          ) : summary && summary.upcomingTasks.length > 0 ? (
            summary.upcomingTasks.map((task) => (
              <div
                key={task.id}
                className="flex flex-col gap-2 rounded-2xl border border-line bg-white/75 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="display-font text-lg font-semibold">
                    {task.title}
                  </p>
                  <p className="mt-1 text-xs uppercase tracking-[0.22em] text-muted">
                    {task.project?.name ?? "Project"} ·{" "}
                    {STATUS_LABEL[task.status] ?? task.status} ·{" "}
                    {task.assignee
                      ? `Assigned to ${task.assignee.name}`
                      : "Unassigned"}
                  </p>
                </div>
                <span
                  className={`inline-flex w-fit rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${
                    isOverdue(task.dueDate)
                      ? "bg-danger/10 text-danger"
                      : "bg-accent-secondary/10 text-accent-secondary"
                  }`}
                >
                  {isOverdue(task.dueDate) ? "Overdue · " : "Due "}
                  {formatDueDate(task.dueDate)}
                </span>
              </div>
            ))
          ) : (
            <p className="rounded-2xl border border-dashed border-line bg-white/50 p-6 text-center text-sm text-muted">
              No upcoming tasks. Create a project and add tasks to populate
              this list.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
