"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { useToast } from "@/components/providers/toast-provider";

type AuthScreenProps = {
  mode: "login" | "register";
};

export default function AuthScreen({ mode }: AuthScreenProps) {
  const router = useRouter();
  const { login, register } = useAuth();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const content = useMemo(
    () =>
      mode === "login"
        ? {
            eyebrow: "Welcome Back",
            title: "Log in and get your day back under control.",
            body: "Your dashboard is ready with search, filters, task actions, and automatic token refresh already wired in.",
            button: "Log In",
            switchText: "Need an account?",
            switchHref: "/register",
            switchLabel: "Create one",
            success: "You are logged in.",
          }
        : {
            eyebrow: "Fresh Start",
            title: "Create your workspace and start planning with clarity.",
            body: "Registration connects directly to the backend, stores your session, and sends you straight into the task dashboard.",
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

    if (!normalizedEmail || !normalizedPassword) {
      showToast("Email and password are required.", "error");
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
          email: normalizedEmail,
          password: normalizedPassword,
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
              Earnest Tasks
            </Link>
            <p className="mt-10 text-sm font-semibold uppercase tracking-[0.3em] text-accent">
              {content.eyebrow}
            </p>
            <h1 className="display-font mt-4 text-balance text-4xl leading-none font-semibold sm:text-3xl">
              {content.title}
            </h1>
            <p className="mt-6 max-w-xl text-base leading-8 text-muted sm:text-base">
              {content.body}
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-3">
              {[
                ["Session", "Access token storage with refresh support"],
                ["Actions", "Create, edit, toggle, and delete tasks fast"],
                ["Flow", "Built for phone screens and roomy desktops"],
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
                  placeholder="At least 8 characters"
                  className="w-full rounded-2xl border border-line bg-background-soft px-4 py-3 text-base outline-none focus:border-accent focus:bg-white"
                />
              </label>

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
