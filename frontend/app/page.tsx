import Link from "next/link";

export default function Home() {
  return (
    <main className="page-grid min-h-screen px-5 py-6 text-foreground sm:px-8 lg:px-12">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-7xl flex-col justify-between gap-10 rounded-[2rem] border border-line/80 bg-white/55 p-6 shadow-[0_24px_80px_rgba(54,38,15,0.12)] backdrop-blur-xl sm:p-8 lg:p-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="display-font text-sm uppercase tracking-[0.35em] text-accent-secondary">
              Earnest Tasks
            </p>
            <h1 className="display-font mt-3 max-w-2xl text-balance text-4xl leading-none font-semibold sm:text-5xl lg:text-6xl">
              Calm planning for days that refuse to stay simple.
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
                Next.js + TypeScript + Tailwind
              </p>
              <p className="text-balance text-lg leading-8 text-muted sm:text-xl">
                Sign in, manage tasks, search fast, filter clearly, and stay
                logged in with refresh-token support already connected to your
                backend API.
              </p>
            </div>

            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              {[
                ["Secure", "JWT access and refresh token flow"],
                ["Responsive", "Comfortable layout on mobile and desktop"],
                ["Focused", "Search, filters, CRUD, and clean toasts"],
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
                Live Workflow
              </p>
              <div className="mt-5 space-y-4">
                {[
                  "Register and log in from dedicated auth screens",
                  "Create tasks, edit details, delete, and toggle completion",
                  "Search by title and filter by task status",
                  "Refresh tokens automatically when access expires",
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
