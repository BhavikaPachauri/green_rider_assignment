"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";
import type { Role } from "@/types/api";

type AuthScreenProps = {
  mode: "login" | "register";
};

export default function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("MEMBER");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const content = useMemo(
    () =>
      mode === "login"
        ? {
            eyebrow: "Welcome Back",
            title: "Log in to your project workspace.",
            body: "Track project progress, assign tasks, and stay on top of overdue work — all with role-based access for admins and members.",
            button: "Log In",
            switchText: "Need an account?",
            switchHref: "/register",
            switchLabel: "Create one",
            success: "You are logged in.",
          }
        : {
            eyebrow: "Get Started",
            title: "Create your account and start managing projects.",
            body: "Choose Admin to manage every project across the workspace, or Member to collaborate on the projects you're invited to.",
            button: "Create Account",
            switchText: "Already registered?",
            switchHref: "/login",
            switchLabel: "Log in",
            success: "Account created and signed in.",
          },
    [mode],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedPassword = password.trim();
    const normalizedName = name.trim();

    if (!normalizedEmail || !normalizedPassword) {
      showToast("Email and password are required.", "error");
      return;
    }

    if (mode === "register" && !normalizedName) {
      showToast("Name is required.", "error");
      return;
    }

    if (normalizedPassword.length < 6) {
      showToast("Password must be at least 6 characters.", "error");
      return;
    }

    try {
      setIsSubmitting(true);

      if (mode === "login") {
        await login({
          email: normalizedEmail,
          password: normalizedPassword,
        });
      } else {
        await register({
          name: normalizedName,
          email: normalizedEmail,
          password: normalizedPassword,
          role,
        });
      }

      showToast(content.success, "success");
      router.push("/dashboard");
    } catch (error) {
      showToast(
        error instanceof Error
          ? error.message
          : "We could not complete that request.",
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="page-grid min-h-screen px-5 py-6 sm:px-8 lg:px-12">
      <div className="mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="glass-panel relative overflow-hidden rounded-[2rem] p-6 sm:p-8 lg:p-10">
          <div className="absolute top-0 right-0 h-48 w-48 translate-x-10 -translate-y-10 rounded-full bg-accent/20 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-56 w-56 -translate-x-10 translate-y-10 rounded-full bg-accent-secondary/18 blur-3xl" />

          <div className="relative">
            <Link
              href="/"
              className="display-font text-sm uppercase tracking-[0.35em] text-accent-secondary"
            >
              Earnest Projects
            </Link>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.3em] text-accent">
              {content.eyebrow}
            </p>
            <h1 className="display-font mt-4 text-balance text-4xl leading-tight font-semibold sm:text-3xl">
              {content.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-base">
              {content.body}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Projects", "Group tasks under projects with team members"],
                ["Roles", "Admins manage everything; members collaborate"],
                ["Overdue", "Spot late tasks and rebalance workloads"],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="rounded-[1.5rem] border border-line bg-white/70 p-4"
                >
                  <p className="display-font text-lg font-semibold">{title}</p>
                  <p className="mt-2 text-sm leading-6 text-muted">{body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="soft-panel flex rounded-[2rem] p-4 sm:p-6 lg:p-8">
          <div className="m-auto w-full max-w-xl rounded-[1.75rem] bg-white p-6 shadow-[0_20px_60px_rgba(54,38,15,0.08)] sm:p-8">
            <div className="mb-8">
              <p className="text-sm uppercase tracking-[0.28em] text-muted">
                {mode === "login" ? "Sign In" : "Register"}
              </p>
              <h2 className="display-font mt-3 text-3xl font-semibold">
                {mode === "login"
                  ? "Let's pick up where you left off."
                  : "Set up your account in a minute."}
              </h2>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {mode === "register" ? (
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-foreground">
                    Full name
                  </span>
                  <input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    type="text"
                    placeholder="Your name"
                    className="w-full rounded-2xl border border-line bg-background-soft px-4 py-3 text-base outline-none focus:border-accent focus:bg-white"
                    autoComplete="name"
                  />
                </label>
              ) : null}

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-foreground">
                  Email address
                </span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-line bg-background-soft px-4 py-3 text-base outline-none focus:border-accent focus:bg-white"
                  autoComplete="email"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-foreground">
                  Password
                </span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  placeholder="At least 6 characters"
                  className="w-full rounded-2xl border border-line bg-background-soft px-4 py-3 text-base outline-none focus:border-accent focus:bg-white"
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                />
              </label>

              {mode === "register" ? (
                <div>
                  <span className="mb-2 block text-sm font-semibold text-foreground">
                    Account role
                  </span>
                  <div className="flex gap-2 rounded-2xl border border-line bg-background-soft p-1">
                    {(
                      [
                        ["MEMBER", "Member"],
                        ["ADMIN", "Admin"],
                      ] as const
                    ).map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setRole(value)}
                        className={`flex-1 rounded-xl px-4 py-2 text-sm font-semibold ${
                          role === value
                            ? "bg-foreground text-white"
                            : "text-muted hover:text-accent"
                        }`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <p className="mt-2 text-xs text-muted">
                    Admins can manage all projects and members. Members can be
                    invited to projects.
                  </p>
                </div>
              ) : null}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-white hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Working..." : content.button}
              </button>
            </form>

            <p className="mt-6 text-sm text-muted">
              {content.switchText}{" "}
              <Link
                href={content.switchHref}
                className="font-semibold text-accent hover:text-accent-strong"
              >
                {content.switchLabel}
              </Link>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
