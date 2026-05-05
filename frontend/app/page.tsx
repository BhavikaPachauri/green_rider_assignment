import Link from "next/link";

export default function Home() {
  return (
    <main className="page-grid min-h-screen px-5 py-6 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col justify-between gap-10 rounded-[2rem] border border-line/80 bg-white/55 p-6 shadow-[0_24px_80px_rgba(54,38,15,0.12)] backdrop-blur-xl sm:p-8 lg:p-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="display-font text-sm uppercase tracking-[0.35em] text-accent-secondary">
              Earnest Projects
            </p>
            <h1 className="display-font mt-3 max-w-2xl text-balance text-4xl leading-tight font-semibold sm:text-5xl lg:text-6xl">
              Run projects, assign work, and track every deadline.
            </h1>
          </div>

          <div className="flex gap-3">
            <Link
              href="/login"
              className="rounded-full border border-line bg-white/80 px-5 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
            >
              Log In
            </Link>
            <Link
              href="/register"
              className="rounded-full bg-accent px-5 py-3 text-sm font-semibold text-white hover:bg-accent-strong"
            >
              Create Account
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="glass-panel overflow-hidden rounded-[2rem] p-6 sm:p-8">
            <div className="max-w-2xl">
              <p className="mb-4 inline-flex rounded-full border border-accent/20 bg-accent/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-accent">
                Next.js · Express · Prisma · MySQL
              </p>
              <p className="text-balance text-lg leading-8 text-muted sm:text-xl">
                A full-stack project tracker with role-based access, project
                workspaces, task assignment, status tracking, and an at-a-glance
                dashboard for overdue work.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Projects", "Group tasks, invite teammates, track progress"],
                ["Roles", "Admin and Member access with route-level guards"],
                ["Dashboard", "Status totals, overdue alerts, upcoming work"],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-line bg-white/70 p-4"
                >
                  <p className="display-font text-xl font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="soft-panel rounded-[2rem] p-6 sm:p-8">
            <div className="rounded-[1.75rem] bg-foreground px-5 py-6 text-white">
              <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                Built-in Workflow
              </p>
              <div className="mt-5 space-y-4">
                {[
                  "Sign up with Admin or Member role",
                  "Create projects and invite teammates by email",
                  "Add tasks with status, due date, and assignee",
                  "Watch overdue and in-progress counts on the dashboard",
                ].map((item, index) => (
                  <div key={item} className="flex gap-3">
                    <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-white/12 text-xs font-semibold">
                      0{index + 1}
                    </div>
                    <p className="text-sm leading-6 text-white/84">{item}</p>
                  </div>
                ))}
              </div>
            </div>

            <Link
              href="/dashboard"
              className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-line bg-white px-5 py-3 text-sm font-semibold text-foreground hover:border-accent hover:text-accent"
            >
              Open Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
