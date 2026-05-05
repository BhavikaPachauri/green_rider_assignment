"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { Project, ProjectListResponse } from "@/types/api";

type Props = {
  reloadKey: number;
  bumpReload: () => void;
};

export default function ProjectsView({ reloadKey, bumpReload }: Props) {
  const { authorizedRequest, session } = useAuth();
  const { showToast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [memberEmail, setMemberEmail] = useState("");
  const [memberProjectId, setMemberProjectId] = useState<number | null>(null);
  const [busyProjectId, setBusyProjectId] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
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
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [authorizedRequest, reloadKey, showToast]);

  const userId = session?.user.id ?? -1;
  const isAdmin = session?.user.role === "ADMIN";

  const canManage = (project: Project) =>
    isAdmin || project.ownerId === userId;

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDescription("");
  };

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!name.trim()) {
      showToast("Project name is required.", "error");
      return;
    }

    try {
      setIsSubmitting(true);
      if (editingId) {
        await authorizedRequest(`/projects/${editingId}`, {
          method: "PATCH",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });
        showToast("Project updated.", "success");
      } else {
        await authorizedRequest("/projects", {
          method: "POST",
          body: JSON.stringify({
            name: name.trim(),
            description: description.trim() || null,
          }),
        });
        showToast("Project created.", "success");
      }
      resetForm();
      bumpReload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not save project.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function startEdit(project: Project) {
    setEditingId(project.id);
    setName(project.name);
    setDescription(project.description ?? "");
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  async function handleDelete(project: Project) {
    if (!canManage(project)) return;
    if (
      typeof window !== "undefined" &&
      !window.confirm(`Delete "${project.name}"? Tasks will be removed too.`)
    ) {
      return;
    }
    try {
      setBusyProjectId(project.id);
      await authorizedRequest(`/projects/${project.id}`, { method: "DELETE" });
      showToast("Project deleted.", "success");
      bumpReload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not delete project.",
        "error",
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleAddMember(projectId: number) {
    if (!memberEmail.trim()) {
      showToast("Enter a member email.", "error");
      return;
    }
    try {
      setBusyProjectId(projectId);
      await authorizedRequest(`/projects/${projectId}/members`, {
        method: "POST",
        body: JSON.stringify({ email: memberEmail.trim().toLowerCase() }),
      });
      showToast("Member added.", "success");
      setMemberEmail("");
      setMemberProjectId(null);
      bumpReload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not add member.",
        "error",
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  async function handleRemoveMember(projectId: number, memberId: number) {
    try {
      setBusyProjectId(projectId);
      await authorizedRequest(
        `/projects/${projectId}/members/${memberId}`,
        { method: "DELETE" },
      );
      showToast("Member removed.", "success");
      bumpReload();
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "Could not remove member.",
        "error",
      );
    } finally {
      setBusyProjectId(null);
    }
  }

  const formTitle = useMemo(
    () => (editingId ? "Edit project" : "Create project"),
    [editingId],
  );

  return (
    <div className="grid gap-6 xl:grid-cols-[0.7fr_1.3fr]">
      <aside className="space-y-6">
        <div className="soft-panel rounded-[2rem] p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="display-font text-2xl font-semibold">{formTitle}</p>
              <p className="mt-2 text-sm leading-6 text-muted">
                Projects group your tasks. The creator becomes the owner and
                can invite members.
              </p>
            </div>
            {editingId ? (
              <button
                onClick={resetForm}
                className="rounded-full border border-line px-3 py-1 text-xs font-semibold text-muted hover:border-accent hover:text-accent"
                type="button"
              >
                Cancel
              </button>
            ) : null}
          </div>

          <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">Name</span>
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Q2 Marketing Site"
                className="w-full rounded-2xl border border-line bg-background-soft px-4 py-3 text-sm outline-none focus:border-accent focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-semibold">
                Description
              </span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={3}
                placeholder="What is this project about?"
                className="w-full rounded-2xl border border-line bg-background-soft px-4 py-3 text-sm outline-none focus:border-accent focus:bg-white"
              />
            </label>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-2xl bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-strong disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSubmitting
                ? "Saving..."
                : editingId
                  ? "Save changes"
                  : "Create project"}
            </button>
          </form>
        </div>
      </aside>

      <section className="space-y-4">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="soft-panel animate-pulse rounded-[1.75rem] p-6"
            >
              <div className="h-5 w-1/3 rounded-full bg-foreground/10" />
              <div className="mt-4 h-3 w-1/2 rounded-full bg-foreground/10" />
              <div className="mt-3 h-3 w-3/4 rounded-full bg-foreground/10" />
            </div>
          ))
        ) : projects.length > 0 ? (
          projects.map((project) => (
            <article
              key={project.id}
              className="glass-panel rounded-[2rem] p-6"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted">
                    Project #{project.id} · Owner {project.owner.name}
                  </p>
                  <h3 className="display-font mt-2 text-2xl font-semibold">
                    {project.name}
                  </h3>
                  {project.description ? (
                    <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
                      {project.description}
                    </p>
                  ) : null}
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    {project._count?.tasks ?? 0} tasks
                  </span>
                  <span className="rounded-full bg-accent-secondary/10 px-3 py-1 text-xs font-semibold text-accent-secondary">
                    {project.members.length} members
                  </span>
                </div>
              </div>

              <div className="mt-5 flex flex-wrap gap-2">
                {project.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center gap-2 rounded-full border border-line bg-white/80 px-3 py-1 text-xs"
                  >
                    <span className="font-semibold text-foreground">
                      {member.user.name}
                    </span>
                    <span className="text-muted">{member.user.email}</span>
                    {canManage(project) &&
                    member.userId !== project.ownerId ? (
                      <button
                        onClick={() =>
                          void handleRemoveMember(project.id, member.userId)
                        }
                        disabled={busyProjectId === project.id}
                        className="text-danger hover:underline"
                        type="button"
                      >
                        Remove
                      </button>
                    ) : member.userId === project.ownerId ? (
                      <span className="rounded-full bg-foreground/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em]">
                        Owner
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>

              {canManage(project) ? (
                <div className="mt-5 flex flex-wrap items-center gap-2">
                  {memberProjectId === project.id ? (
                    <>
                      <input
                        value={memberEmail}
                        onChange={(event) => setMemberEmail(event.target.value)}
                        placeholder="member@example.com"
                        className="min-w-0 flex-1 rounded-full border border-line bg-white px-4 py-2 text-sm outline-none focus:border-accent"
                      />
                      <button
                        onClick={() => void handleAddMember(project.id)}
                        disabled={busyProjectId === project.id}
                        className="rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent-strong disabled:opacity-60"
                        type="button"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => {
                          setMemberProjectId(null);
                          setMemberEmail("");
                        }}
                        className="rounded-full border border-line px-4 py-2 text-sm font-semibold text-muted hover:border-accent hover:text-accent"
                        type="button"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => {
                          setMemberProjectId(project.id);
                          setMemberEmail("");
                        }}
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
                        type="button"
                      >
                        Invite member
                      </button>
                      <button
                        onClick={() => startEdit(project)}
                        className="rounded-full border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
                        type="button"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => void handleDelete(project)}
                        disabled={busyProjectId === project.id}
                        className="rounded-full border border-danger/30 px-4 py-2 text-sm font-semibold text-danger hover:bg-danger/10 disabled:opacity-60"
                        type="button"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ) : null}
            </article>
          ))
        ) : (
          <div className="soft-panel rounded-[2rem] p-10 text-center">
            <p className="display-font text-3xl font-semibold">
              No projects yet
            </p>
            <p className="mt-3 text-sm leading-6 text-muted">
              Create your first project from the panel on the left to start
              tracking tasks with your team.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
