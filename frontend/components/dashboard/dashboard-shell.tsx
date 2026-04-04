"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  startTransition,
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { Pagination, Task, TaskListResponse } from "@/types/api";

type TaskFormMode = "create" | "edit";
type StatusFilter = "all" | "true" | "false";

const defaultPagination: Pagination = {
  page: 1,
  limit: 6,
  total: 0,
  totalPages: 1,
};

export default function DashboardShell() {
  const router = useRouter();
  const { hydrated, isAuthenticated, session, logout, authorizedRequest } =
    useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] = useState<Pagination>(defaultPagination);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [searchInput, setSearchInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workingTaskId, setWorkingTaskId] = useState<number | null>(null);
  const [formMode, setFormMode] = useState<TaskFormMode>("create");
  const [draftTitle, setDraftTitle] = useState("");
  const [editingTaskId, setEditingTaskId] = useState<number | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const deferredSearch = useDeferredValue(searchInput.trim());

  const summary = useMemo(() => {
    const completed = tasks.filter((task) => task.completed).length;
    const pending = tasks.length - completed;

    return {
      completed,
      pending,
      total: pagination.total,
    };
  }, [pagination.total, tasks]);

  const runQuery = useEffectEvent(async () => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pagination.limit || 6),
    });

    if (statusFilter !== "all") {
      params.set("status", statusFilter);
    }

    if (deferredSearch) {
      params.set("search", deferredSearch);
    }

    setIsLoading(true);

    try {
      const response = await authorizedRequest<TaskListResponse>(
        `/tasks?${params.toString()}`,
      );

      setTasks(response.data);
      setPagination(response.pagination);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "We could not load tasks.",
        "error",
      );

      if (
        error instanceof Error &&
        error.message.toLowerCase().includes("log in")
      ) {
        router.replace("/login");
      }
    } finally {
      setIsLoading(false);
    }
  });

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    if (!isAuthenticated) {
      router.replace("/login");
      return;
    }

    startTransition(() => {
      void runQuery();
    });
  }, [
    deferredSearch,
    hydrated,
    isAuthenticated,
    page,
    reloadKey,
    router,
    statusFilter,
  ]);

  async function handleLogout() {
    await logout();
    showToast("You have been logged out.", "success");
    router.push("/login");
  }

  async function handleTaskSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const title = draftTitle.trim();

    if (!title) {
      showToast("Task title is required.", "error");
      return;
    }

    try {
      setIsSubmitting(true);

      if (formMode === "edit" && editingTaskId) {
        await authorizedRequest(`/tasks/${editingTaskId}`, {
          method: "PATCH",
          body: JSON.stringify({ title }),
        });
        showToast("Task updated.", "success");
      } else {
        await authorizedRequest("/tasks", {
          method: "POST",
          body: JSON.stringify({ title }),
        });
        showToast("Task created.", "success");
      }

      setFormMode("create");
      setEditingTaskId(null);
      setDraftTitle("");

      setReloadKey((current) => current + 1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Task action failed.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleEdit(task: Task) {
    setFormMode("edit");
    setEditingTaskId(task.id);
    setDraftTitle(task.title);
  }

  async function handleToggle(taskId: number) {
    try {
      setWorkingTaskId(taskId);
      await authorizedRequest(`/tasks/${taskId}/toggle`, {
        method: "PATCH",
      });
      showToast("Task status updated.", "success");
      setReloadKey((current) => current + 1);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Toggle failed.",
        "error",
      );
    } finally {
      setWorkingTaskId(null);
    }
  }

  async function handleDelete(taskId: number) {
    try {
      setWorkingTaskId(taskId);
      await authorizedRequest(`/tasks/${taskId}`, {
        method: "DELETE",
      });
      showToast("Task deleted.", "success");

      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        setReloadKey((current) => current + 1);
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Delete failed.",
        "error",
      );
    } finally {
      setWorkingTaskId(null);
    }
  }

  if (!hydrated || !isAuthenticated) {
    return (
      <main className="page-grid flex min-h-screen items-center justify-center px-5 py-6">
        <div className="glass-panel rounded-[2rem] px-6 py-8 text-center">
          <p className="display-font text-2xl font-semibold">
            Loading workspace...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="page-grid min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="glass-panel rounded-[2rem] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="display-font text-sm uppercase tracking-[0.35em] text-accent-secondary">
                Dashboard
              </p>
              <h1 className="display-font mt-3 text-balance text-4xl leading-none font-semibold sm:text-3xl">
                Plan boldly. Finish calmly.
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-muted">
                Signed in as{" "}
                <span className="font-semibold text-foreground">
                  {session?.email}
                </span>
                . Search by title, filter by status, and keep your task list
                moving without losing your place.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-line bg-white/70 px-5 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
              >
                Home
              </Link>
              <button
                onClick={handleLogout}
                className="rounded-full bg-foreground px-5 py-3 text-sm font-semibold text-white hover:bg-accent"
              >
                Log Out
              </button>
            </div>
          </div>
        </header>

        <section className="grid gap-6 xl:grid-cols-[0.72fr_1.28fr]">
          <aside className="space-y-2">
            <div className="soft-panel rounded-[2rem] p-6">
              <div className="grid gap-4 sm:grid-cols-3 xl:grid-cols-1">
                {[
                  ["Total", String(summary.total), "All tasks in your account"],
                  [
                    "Pending",
                    String(summary.pending),
                    "Current page items still open",
                  ],
                  [
                    "Completed",
                    String(summary.completed),
                    "Current page items already done",
                  ],
                ].map(([label, value, body]) => (
                  <div
                    key={label}
                    className="rounded-[1.5rem] border border-line bg-white/75 p-4"
                  >
                    <p className="text-sm uppercase tracking-[0.25em] text-muted">
                      {label}
                    </p>
                    <p className="display-font mt-3 text-4xl font-semibold">
                      {value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="soft-panel rounded-[2rem] p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="display-font text-2xl font-semibold">
                    {formMode === "edit" ? "Edit task" : "Add task"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Keep the title short, clear, and easy to scan.
                  </p>
                </div>
                {formMode === "edit" ? (
                  <button
                    onClick={() => {
                      setFormMode("create");
                      setEditingTaskId(null);
                      setDraftTitle("");
                    }}
                    className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-accent"
                  >
                    Cancel
                  </button>
                ) : null}
              </div>

              <form className="mt-6 space-y-4" onSubmit={handleTaskSubmit}>
                <textarea
                  value={draftTitle}
                  onChange={(event) => setDraftTitle(event.target.value)}
                  rows={4}
                  placeholder="Outline the next important thing..."
                  className="w-full rounded-[1.5rem] border border-line bg-background-soft px-4 py-3 text-base outline-none focus:border-accent focus:bg-white"
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting
                    ? "Saving..."
                    : formMode === "edit"
                      ? "Save changes"
                      : "Create task"}
                </button>
              </form>
            </div>
          </aside>

          <section className="space-y-6">
            <div className="glass-panel rounded-[2rem] p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="display-font text-2xl font-semibold">
                    Task board
                  </p>
                  <p className="mt-2 text-sm leading-6 text-muted">
                    Browse your tasks with search, filtering, and pagination.
                  </p>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <input
                    value={searchInput}
                    onChange={(event) => {
                      setSearchInput(event.target.value);
                      setPage(1);
                    }}
                    placeholder="Search by task title"
                    className="min-w-0 rounded-full border border-line bg-white/80 px-4 py-3 text-sm outline-none focus:border-accent"
                  />

                  <div className="flex rounded-full border border-line bg-white/80 p-1">
                    {[
                      ["all", "All"],
                      ["false", "Open"],
                      ["true", "Done"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() => {
                          setStatusFilter(value as StatusFilter);
                          setPage(1);
                        }}
                        className={`rounded-full px-4 py-2 text-sm font-semibold ${
                          statusFilter === value
                            ? "bg-foreground text-white"
                            : "text-muted hover:text-accent"
                        }`}
                        type="button"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, index) => (
                  <div
                    key={index}
                    className="soft-panel animate-pulse rounded-[1.75rem] p-5"
                  >
                    <div className="h-5 w-24 rounded-full bg-foreground/10" />
                    <div className="mt-4 h-6 rounded-full bg-foreground/10" />
                    <div className="mt-2 h-6 w-3/4 rounded-full bg-foreground/10" />
                  </div>
                ))
              ) : tasks.length > 0 ? (
                tasks.map((task) => (
                  <article
                    key={task.id}
                    className="soft-panel card-hover rounded-[1.75rem] p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span
                        className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] ${
                          task.completed
                            ? "bg-success/12 text-success"
                            : "bg-accent/12 text-accent"
                        }`}
                      >
                        {task.completed ? "Completed" : "In progress"}
                      </span>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-muted">
                        #{task.id}
                      </span>
                    </div>

                    <h2 className="display-font mt-4 text-2xl leading-tight font-semibold">
                      {task.title}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      Created {new Date(task.createdAt).toLocaleDateString()}
                    </p>

                    <div className="mt-6 flex flex-wrap gap-2">
                      <button
                        onClick={() => void handleToggle(task.id)}
                        disabled={workingTaskId === task.id}
                        className="rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-white hover:bg-accent disabled:opacity-60"
                      >
                        {workingTaskId === task.id
                          ? "Working..."
                          : task.completed
                            ? "Mark open"
                            : "Mark done"}
                      </button>
                      <button
                        onClick={() => void handleEdit(task)}
                        disabled={workingTaskId === task.id}
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-60"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(task.id)}
                        disabled={workingTaskId === task.id}
                        className="rounded-full border border-danger/25 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                ))
              ) : (
                <div className="soft-panel col-span-full rounded-[1.75rem] p-10 text-center">
                  <p className="display-font text-3xl font-semibold">
                    Nothing matches this view yet.
                  </p>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    Try a new search, switch the filter, or add your next task
                    from the panel on the left.
                  </p>
                </div>
              )}
            </div>

            <div className="glass-panel flex flex-col gap-4 rounded-[2rem] p-5 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-muted">
                Page {pagination.page} of {pagination.totalPages} with{" "}
                {pagination.total} total tasks.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={page <= 1}
                  className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-40"
                >
                  Previous
                </button>
                <button
                  onClick={() =>
                    setPage((current) =>
                      Math.min(pagination.totalPages, current + 1),
                    )
                  }
                  disabled={page >= pagination.totalPages}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          </section>
        </section>
      </div>
    </main>
  );
}
