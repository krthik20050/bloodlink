"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

type MessageTone = "info" | "success" | "error";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");
  const [busy, setBusy] = useState(false);

  function setStatus(nextMessage: string, nextTone: MessageTone = "info") {
    setMessage(nextMessage);
    setTone(nextTone);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!email || !password) {
      setStatus("Enter both email and password to continue.", "error");
      return;
    }

    setBusy(true);
    setStatus("");
    const supabase = createSupabaseBrowserClient();
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });

    if (result.error) {
      setStatus(result.error.message, "error");
    } else {
      setStatus(mode === "sign-up" ? "Check your email to confirm your account." : "Signed in. You can now create a request or donor profile.", "success");
    }
    setBusy(false);
  }

  async function magicLink() {
    if (!email) {
      setStatus("Enter your email first so we can send a secure sign-in link.", "error");
      return;
    }

    setBusy(true);
    setStatus("");
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });

    setStatus(error?.message ?? "Check your email for a secure sign-in link.", error ? "error" : "success");
    setBusy(false);
  }

  async function google() {
    setBusy(true);
    setStatus("");
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });

    if (error) {
      setStatus(error.message, "error");
      setBusy(false);
    }
  }

  return (
    <main className="shell auth-shell">
      <header className="topbar" aria-label="Account navigation">
        <Link href="/" className="brand" aria-label="BloodLink home">BloodLink</Link>
        <nav className="nav-cluster" aria-label="Quick links">
          <Link href="/request" className="nav-link">Request</Link>
          <Link href="/donor" className="nav-link">Donate</Link>
        </nav>
        <a className="telegram-cta" href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? "eblooddonataionbot"}`} target="_blank" rel="noreferrer">
          Telegram
        </a>
      </header>

      <section className="auth-layout" aria-label="Authentication panel">
        <div className="auth-side">
          <p className="kicker">Your BloodLink account</p>
          <h1>Keep requests, donor preferences, and follow-ups together.</h1>
          <ul>
            <li>Save your donor profile in one tap.</li>
            <li>Track blood requests without repeating your details.</li>
            <li>Use a secure Google, magic-link, or email sign-in.</li>
          </ul>
        </div>

        <section className="panel auth-panel" aria-live="polite">
          <div className="auth-mode-switch" role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              className={mode === "sign-in" ? "mode-button active" : "mode-button"}
              onClick={() => {
                setMode("sign-in");
                setStatus("");
              }}
              aria-pressed={mode === "sign-in"}
            >
              Sign in
            </button>
            <button
              type="button"
              className={mode === "sign-up" ? "mode-button active" : "mode-button"}
              onClick={() => {
                setMode("sign-up");
                setStatus("");
              }}
              aria-pressed={mode === "sign-up"}
            >
              Create account
            </button>
          </div>

          <div className="auth-provider-stack">
            <button type="button" className="secondary auth-provider" onClick={google} disabled={busy}>
              Continue with Google
            </button>
          </div>

          <div className="auth-divider" aria-hidden="true">
            <span>or continue with email</span>
          </div>

          <form onSubmit={submit} className="auth-form">
            <label className="field">
              <span>Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>

            <label className="field">
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                minLength={8}
                autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                placeholder={mode === "sign-in" ? "Enter your password" : "Create a password with 8+ characters"}
              />
            </label>

            <button type="submit" className="primary auth-submit" disabled={busy}>
              {busy ? "Working…" : mode === "sign-in" ? "Sign in" : "Create account"}
            </button>
          </form>

          <button type="button" className="text-button auth-inline-button" onClick={magicLink} disabled={busy || !email}>
            Email me a magic link
          </button>

          <button
            type="button"
            className="text-button auth-inline-button"
            onClick={() => {
              setMode((current) => (current === "sign-in" ? "sign-up" : "sign-in"));
              setStatus("");
            }}
          >
            {mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}
          </button>

          {message && (
            <p className={`notice ${tone === "error" ? "notice-error" : tone === "success" ? "notice-success" : ""}`} role="status">
              {message}
            </p>
          )}
        </section>
      </section>
    </main>
  );
}
