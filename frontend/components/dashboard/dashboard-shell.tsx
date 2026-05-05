"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import OverviewView from "@/components/dashboard/overview-view";
import ProjectsView from "@/components/dashboard/projects-view";
import TasksView from "@/components/dashboard/tasks-view";

type View = "overview" | "projects" | "tasks";

const TABS: Array<[View, string, string]> = [
  ["overview", "Overview", "Stats and upcoming tasks"],
  ["projects", "Projects", "Workspaces and team members"],
  ["tasks", "Tasks", "Assignments, statuses, and due dates"],
];

export default function DashboardShell() {
  const router = useRouter();
  const { hydrated, isAuthenticated, session, logout } = useAuth();
  const { showToast } = useToast();
  const [view, setView] = useState<View>("overview");
  const [reloadKey, setReloadKey] = useState(0);

  const bumpReload = () => setReloadKey((current) => current + 1);

  useEffect(() => {
    if (!hydrated) return;
    if (!isAuthenticated) {
      router.replace("/login");
    }
  }, [hydrated, isAuthenticated, router]);

  async function handleLogout() {
    await logout();
    showToast("You have been logged out.", "success");
    router.push("/login");
  }

  if (!hydrated || !isAuthenticated || !session) {
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

  const initials = session.user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <main className="page-grid min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <header className="glass-panel rounded-[2rem] px-6 py-6 sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <div
                aria-hidden
                className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-lg font-semibold text-white"
              >
                {initials || "EA"}
              </div>
              <div>
                <p className="display-font text-sm uppercase tracking-[0.32em] text-accent-secondary">
                  Earnest Projects
                </p>
                <h1 className="display-font mt-1 text-balance text-3xl leading-tight font-semibold">
                  Welcome back, {session.user.name}.
                </h1>
                <p className="mt-1 text-sm text-muted">
                  Signed in as{" "}
                  <span className="font-semibold text-foreground">
                    {session.user.email}
                  </span>{" "}
                  ·{" "}
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${
                      session.user.role === "ADMIN"
                        ? "bg-accent/15 text-accent"
                        : "bg-accent-secondary/15 text-accent-secondary"
                    }`}
                  >
                    {session.user.role}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/"
                className="rounded-full border border-line bg-white/70 px-5 py-2.5 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
              >
                Home
              </Link>
              <button
                onClick={handleLogout}
                type="button"
                className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-white hover:bg-accent"
              >
                Log Out
              </button>
            </div>
          </div>

          <nav className="mt-6 flex flex-wrap gap-2">
            {TABS.map(([id, label, hint]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`group flex flex-col rounded-2xl px-5 py-3 text-left text-sm font-semibold transition ${
                  view === id
                    ? "bg-foreground text-white"
                    : "border border-line bg-white/70 text-foreground hover:border-accent hover:text-accent"
                }`}
              >
                <span>{label}</span>
                <span
                  className={`text-[10px] font-medium uppercase tracking-[0.22em] ${
                    view === id ? "text-white/70" : "text-muted"
                  }`}
                >
                  {hint}
                </span>
              </button>
            ))}
          </nav>
        </header>

        {view === "overview" ? (
          <OverviewView reloadKey={reloadKey} />
        ) : view === "projects" ? (
          <ProjectsView reloadKey={reloadKey} bumpReload={bumpReload} />
        ) : (
          <TasksView reloadKey={reloadKey} bumpReload={bumpReload} />
        )}
      </div>
    </main>
  );
}
