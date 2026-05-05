"use client";

import {
  startTransition,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import type {
  Pagination,
  Project,
  ProjectListResponse,
  Task,
  TaskListResponse,
  TaskStatus,
} from "@/types/api";

type FilterStatus = "ALL" | TaskStatus | "OVERDUE" | "MINE";

const defaultPagination: Pagination = {
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
};

const STATUS_LABEL: Record<TaskStatus, string> = {
  TODO: "To do",
  IN_PROGRESS: "In progress",
  DONE: "Done",
};

const STATUS_TONE: Record<TaskStatus, string> = {
  TODO: "bg-foreground/10 text-foreground",
  IN_PROGRESS: "bg-accent/12 text-accent",
  DONE: "bg-success/12 text-success",
};

const formatDate = (value: string | null) => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const isOverdue = (task: Task) => {
  if (!task.dueDate || task.status === "DONE") return false;
  return new Date(task.dueDate).getTime() < Date.now();
};

const toInputDate = (value: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

type Props = {
  reloadKey: number;
  bumpReload: () => void;
};

export default function TasksView({ reloadKey, bumpReload }: Props) {
  const { authorizedRequest, session } = useAuth();
  const { showToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [pagination, setPagination] =
    useState<Pagination>(defaultPagination);
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [projectFilter, setProjectFilter] = useState<number | "ALL">("ALL");
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [isLoading, setIsLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);

  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [draft, setDraft] = useState({
    title: "",
    description: "",
    projectId: "",
    assigneeId: "",
    dueDate: "",
    status: "TODO" as TaskStatus,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null);

  const userId = session?.user.id ?? -1;
  const isAdmin = session?.user.role === "ADMIN";

  useEffect(() => {
    let cancelled = false;
    authorizedRequest<ProjectListResponse>("/projects")
      .then((response) => {
        if (!cancelled) setProjects(response.data);
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(
            error instanceof Error
              ? error.message
              : "Could not load projects.",
            "error",
          );
        }
      });
    return () => {
      cancelled = true;
    };
  }, [authorizedRequest, reloadKey, showToast]);

  useEffect(() => {
    let cancelled = false;
    const params = new URLSearchParams({
      page: String(page),
      limit: String(pagination.limit || 12),
    });
    if (deferredSearch) params.set("search", deferredSearch);
    if (filter === "OVERDUE") {
      params.set("overdue", "true");
    } else if (filter === "MINE") {
      params.set("mine", "true");
    } else if (filter !== "ALL") {
      params.set("status", filter);
    }
    if (projectFilter !== "ALL") {
      params.set("projectId", String(projectFilter));
    }

    setIsLoading(true);
    authorizedRequest<TaskListResponse>(`/tasks?${params.toString()}`)
      .then((response) => {
        if (!cancelled) {
          setTasks(response.data);
          setPagination(response.pagination);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          showToast(
            error instanceof Error ? error.message : "Could not load tasks.",
            "error",
          );
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    authorizedRequest,
    deferredSearch,
    filter,
    page,
    projectFilter,
    pagination.limit,
    reloadKey,
    showToast,
  ]);

  const projectMembersForCurrent = useMemo(() => {
    const project = projects.find(
      (p) => String(p.id) === String(draft.projectId),
    );
    if (!project) return [];
    return project.members.map((m) => m.user);
  }, [draft.projectId, projects]);

  function openCreate() {
    setEditingTask(null);
    setDraft({
      title: "",
      description: "",
      projectId: projects[0] ? String(projects[0].id) : "",
      assigneeId: "",
      dueDate: "",
      status: "TODO",
    });
    setShowForm(true);
  }

  function openEdit(task: Task) {
    setEditingTask(task);
    setDraft({
      title: task.title,
      description: task.description ?? "",
      projectId: String(task.projectId),
      assigneeId: task.assigneeId ? String(task.assigneeId) : "",
      dueDate: toInputDate(task.dueDate),
      status: task.status,
    });
    setShowForm(true);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim()) {
      showToast("Title is required.", "error");
      return;
    }
    if (!editingTask && !draft.projectId) {
      showToast("Select a project for this task.", "error");
      return;
    }

    const payload: Record<string, unknown> = {
      title: draft.title.trim(),
      description: draft.description.trim() || null,
      status: draft.status,
      dueDate: draft.dueDate ? new Date(draft.dueDate).toISOString() : null,
      assigneeId: draft.assigneeId ? Number(draft.assigneeId) : null,
    };

    if (!editingTask) {
      payload.projectId = Number(draft.projectId);
    }

    try {
      setIsSubmitting(true);
      if (editingTask) {
        await authorizedRequest(`/tasks/${editingTask.id}`, {
          method: "PATCH",
          body: JSON.stringify(payload),
        });
        showToast("Task updated.", "success");
      } else {
        await authorizedRequest("/tasks", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        showToast("Task created.", "success");
      }
      setShowForm(false);
      setEditingTask(null);
      bumpReload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not save task.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleStatusChange(task: Task, status: TaskStatus) {
    try {
      setBusyTaskId(task.id);
      await authorizedRequest(`/tasks/${task.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      showToast("Status updated.", "success");
      bumpReload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Update failed.",
        "error",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  async function handleDelete(task: Task) {
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete task "${task.title}"?`)
    ) {
      return;
    }
    try {
      setBusyTaskId(task.id);
      await authorizedRequest(`/tasks/${task.id}`, { method: "DELETE" });
      showToast("Task deleted.", "success");
      if (tasks.length === 1 && page > 1) {
        setPage((current) => current - 1);
      } else {
        bumpReload();
      }
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Delete failed.",
        "error",
      );
    } finally {
      setBusyTaskId(null);
    }
  }

  const canEditTask = (task: Task) => {
    if (isAdmin) return true;
    if (task.creatorId === userId) return true;
    if (task.project?.ownerId === userId) return true;
    return false;
  };

  const canChangeStatus = (task: Task) =>
    canEditTask(task) || task.assigneeId === userId;

  const filterOptions: Array<[FilterStatus, string]> = [
    ["ALL", "All"],
    ["TODO", "To do"],
    ["IN_PROGRESS", "In progress"],
    ["DONE", "Done"],
    ["OVERDUE", "Overdue"],
    ["MINE", "Assigned to me"],
  ];

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="display-font text-2xl font-semibold">Task board</p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Search, filter by status or project, and keep work moving.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                startTransition(() => setPage(1));
              }}
              placeholder="Search by title"
              className="min-w-0 rounded-full border border-line bg-white/80 px-4 py-2 text-sm outline-none focus:border-accent"
            />
            <select
              value={projectFilter === "ALL" ? "ALL" : String(projectFilter)}
              onChange={(event) => {
                const value = event.target.value;
                setProjectFilter(value === "ALL" ? "ALL" : Number(value));
                setPage(1);
              }}
              className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm outline-none focus:border-accent"
            >
              <option value="ALL">All projects</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={openCreate}
              disabled={projects.length === 0}
              className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
            >
              + New task
            </button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {filterOptions.map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] ${
                filter === value
                  ? "bg-foreground text-white"
                  : "border border-line bg-white/70 text-muted hover:border-accent hover:text-accent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {showForm ? (
        <div className="soft-panel rounded-[2rem] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="display-font text-2xl font-semibold">
                {editingTask ? "Edit task" : "New task"}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted">
                {editingTask
                  ? "Update title, status, due date, or assignee."
                  : "Choose a project and optionally assign a member."}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setEditingTask(null);
              }}
              className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
            >
              Close
            </button>
          </div>

          <form
            className="mt-5 grid gap-4 md:grid-cols-2"
            onSubmit={handleSubmit}
          >
            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">Title</span>
              <input
                value={draft.title}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    title: event.target.value,
                  }))
                }
                placeholder="Outline the next step..."
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block md:col-span-2">
              <span className="mb-2 block text-sm font-semibold">
                Description
              </span>
              <textarea
                value={draft.description}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    description: event.target.value,
                  }))
                }
                rows={3}
                placeholder="Optional details, links, acceptance criteria..."
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Project</span>
              <select
                value={draft.projectId}
                disabled={Boolean(editingTask)}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    projectId: event.target.value,
                    assigneeId: "",
                  }))
                }
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent disabled:opacity-70"
              >
                <option value="">Select a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Assignee
              </span>
              <select
                value={draft.assigneeId}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    assigneeId: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              >
                <option value="">Unassigned</option>
                {projectMembersForCurrent.map((member) => (
                  <option key={member.id} value={member.id}>
                    {member.name} ({member.email})
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Status</span>
              <select
                value={draft.status}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    status: event.target.value as TaskStatus,
                  }))
                }
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              >
                <option value="TODO">To do</option>
                <option value="IN_PROGRESS">In progress</option>
                <option value="DONE">Done</option>
              </select>
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Due date
              </span>
              <input
                type="date"
                value={draft.dueDate}
                onChange={(event) =>
                  setDraft((current) => ({
                    ...current,
                    dueDate: event.target.value,
                  }))
                }
                className="w-full rounded-2xl border border-line bg-white px-4 py-3 text-sm outline-none focus:border-accent"
              />
            </label>

            <div className="md:col-span-2 flex justify-end gap-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting
                  ? "Saving..."
                  : editingTask
                    ? "Save changes"
                    : "Create task"}
              </button>
            </div>
          </form>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {isLoading ? (
          Array.from({ length: 6 }).map((_, index) => (
            <div
              key={index}
              className="soft-panel animate-pulse rounded-[1.75rem] p-5"
            >
              <div className="h-4 w-20 rounded-full bg-foreground/10" />
              <div className="mt-4 h-6 rounded-full bg-foreground/10" />
              <div className="mt-2 h-4 w-3/4 rounded-full bg-foreground/10" />
            </div>
          ))
        ) : tasks.length > 0 ? (
          tasks.map((task) => {
            const overdue = isOverdue(task);
            const canEdit = canEditTask(task);
            const canStatus = canChangeStatus(task);
            return (
              <article
                key={task.id}
                className="soft-panel card-hover rounded-[1.75rem] p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] ${STATUS_TONE[task.status]}`}
                  >
                    {STATUS_LABEL[task.status]}
                  </span>
                  {overdue ? (
                    <span className="rounded-full bg-danger/10 px-3 py-1 text-xs font-semibold text-danger">
                      Overdue
                    </span>
                  ) : (
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted">
                      #{task.id}
                    </span>
                  )}
                </div>

                <h3 className="display-font mt-4 text-xl leading-snug font-semibold">
                  {task.title}
                </h3>
                {task.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {task.description}
                  </p>
                ) : null}

                <dl className="mt-4 space-y-1 text-xs text-muted">
                  <div className="flex justify-between gap-2">
                    <dt>Project</dt>
                    <dd className="font-semibold text-foreground">
                      {task.project?.name ?? "—"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Assignee</dt>
                    <dd className="font-semibold text-foreground">
                      {task.assignee?.name ?? "Unassigned"}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-2">
                    <dt>Due</dt>
                    <dd
                      className={`font-semibold ${overdue ? "text-danger" : "text-foreground"}`}
                    >
                      {formatDate(task.dueDate) ?? "No due date"}
                    </dd>
                  </div>
                </dl>

                <div className="mt-5 flex flex-wrap gap-2">
                  {canStatus
                    ? (
                        [
                          ["TODO", "To do"],
                          ["IN_PROGRESS", "In progress"],
                          ["DONE", "Done"],
                        ] as const
                      ).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          disabled={
                            busyTaskId === task.id || task.status === value
                          }
                          onClick={() =>
                            void handleStatusChange(task, value as TaskStatus)
                          }
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            task.status === value
                              ? "bg-foreground text-white"
                              : "border border-line bg-white text-muted hover:border-accent hover:text-accent"
                          } disabled:opacity-50`}
                        >
                          {label}
                        </button>
                      ))
                    : null}
                </div>

                {canEdit ? (
                  <div className="mt-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEdit(task)}
                      className="rounded-full border border-line px-4 py-2 text-xs font-semibold text-foreground hover:border-accent hover:text-accent"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(task)}
                      disabled={busyTaskId === task.id}
                      className="rounded-full border border-danger/30 px-4 py-2 text-xs font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                    >
                      Delete
                    </button>
                  </div>
                ) : null}
              </article>
            );
          })
        ) : (
          <div className="soft-panel col-span-full rounded-[1.75rem] p-10 text-center">
            <p className="display-font text-3xl font-semibold">
              No tasks match this view
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Adjust the filters or create a new task to get started.
            </p>
          </div>
        )}
      </div>

      <div className="glass-panel flex flex-col gap-4 rounded-[2rem] p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted">
          Page {pagination.page} of {pagination.totalPages} · {pagination.total}{" "}
          tasks total.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            disabled={page <= 1}
            className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:text-accent disabled:opacity-40"
          >
            Previous
          </button>
          <button
            type="button"
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
    </div>
  );
}
