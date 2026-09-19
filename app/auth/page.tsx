"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BrandLogo } from "@/components/landing/BrandLogo";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import {
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
  CheckCircle2,
  Mail,
  Lock,
  Eye,
  EyeOff,
} from "lucide-react";

type MessageTone = "info" | "success" | "error";

function AuthForm() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [tone, setTone] = useState<MessageTone>("info");
  const [busy, setBusy] = useState(false);

  // ponytail: surface OAuth callback failures instead of a silent blank form
  useEffect(() => {
    const code = searchParams.get("error");
    if (code === "missing_code" || code === "callback_failed") {
      setMessage(
        "Google sign-in could not be completed. Check the Supabase redirect URLs and Google console setup, then try again."
      );
      setTone("error");
    } else if (code) {
      setMessage(decodeURIComponent(code).replace(/_/g, " "));
      setTone("error");
    }
  }, [searchParams]);

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
    try {
      const supabase = createSupabaseBrowserClient();
      const result =
        mode === "sign-in"
          ? await supabase.auth.signInWithPassword({ email, password })
          : await supabase.auth.signUp({
              email,
              password,
              options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
            });

      if (result.error) {
        setStatus(result.error.message, "error");
      } else {
        setStatus(
          mode === "sign-up"
            ? "Check your email to confirm your account."
            : "Signed in successfully. Redirecting you to your profile…",
          "success"
        );
        if (mode === "sign-in") {
          window.location.href = "/donor";
        }
      }
    } catch {
      setStatus("Authentication service unavailable. Please retry shortly.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function magicLink() {
    if (!email) {
      setStatus("Enter your email first so we can send a secure sign-in link.", "error");
      return;
    }

    setBusy(true);
    setStatus("");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      });

      setStatus(
        error?.message ?? "Check your email for a secure sign-in link.",
        error ? "error" : "success"
      );
    } catch {
      setStatus("Could not send magic link. Please check your email format.", "error");
    } finally {
      setBusy(false);
    }
  }

  async function google() {
    setBusy(true);
    setStatus("");
    try {
      const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: `${window.location.origin}/auth/callback` },
      });

      if (error) {
        setStatus(error.message, "error");
        setBusy(false);
      }
    } catch {
      setStatus("OAuth initialization failed. Please try email sign in.", "error");
      setBusy(false);
    }
  }

  return (
    <div className="rs-page-shell rs-auth-shell">
      <header className="rs-header" aria-label="Account navigation">
        <div className="rs-header-inner">
          <div className="rs-header-left">
            <BrandLogo />
          </div>
          <div className="rs-header-right">
            <Link href="/" className="rs-btn-secondary rs-btn-sm">
              <ArrowLeft size={14} /> Back to Home
            </Link>
          </div>
        </div>
      </header>

      <main className="rs-auth-main" id="main-content">
        <div className="rs-auth-container">
          <div className="rs-auth-layout">
            {/* Left Column: Brand / Welcome Message */}
            <div className="rs-auth-left">
              <span className="rs-section-eyebrow">ACCOUNT ACCESS</span>
              <h1 className="rs-auth-hero-title">
                {mode === "sign-in" ? "Welcome back." : "Create your account."}
              </h1>
              <p className="rs-auth-hero-desc">
                Sign in to manage your donor profile, view coordination status, and update your emergency transit availability.
              </p>

              {/* Subtle 3-node connection signature */}
              <div className="rs-auth-signature" aria-hidden="true">
                <svg width="180" height="32" viewBox="0 0 180 32" fill="none">
                  <circle cx="16" cy="16" r="3.5" stroke="#969794" strokeWidth="1.5" />
                  <line
                    x1="20"
                    y1="16"
                    x2="86"
                    y2="16"
                    stroke="#E3E3DF"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                  <circle cx="90" cy="16" r="3.5" stroke="#969794" strokeWidth="1.5" />
                  <line
                    x1="94"
                    y1="16"
                    x2="158"
                    y2="16"
                    stroke="var(--rs-accent, #8F2638)"
                    strokeWidth="1.25"
                  />
                  <circle cx="164" cy="16" r="4.5" fill="var(--rs-accent, #8F2638)" />
                </svg>
              </div>
            </div>

            {/* Right Column: Authentication Form */}
            <div className="rs-auth-right">
              <div className="rs-auth-form-card">
                {/* Mode Switcher Tabs */}
                <div className="rs-auth-tabs" role="tablist" aria-label="Sign in mode">
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "sign-in"}
                    className={`rs-auth-tab ${mode === "sign-in" ? "rs-auth-tab--active" : ""}`}
                    onClick={() => {
                      setMode("sign-in");
                      setStatus("");
                    }}
                  >
                    Sign in
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={mode === "sign-up"}
                    className={`rs-auth-tab ${mode === "sign-up" ? "rs-auth-tab--active" : ""}`}
                    onClick={() => {
                      setMode("sign-up");
                      setStatus("");
                    }}
                  >
                    Create account
                  </button>
                </div>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  className="rs-google-btn"
                  onClick={google}
                  disabled={busy}
                >
                  <svg className="rs-google-icon" width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                    <path
                      fill="#4285F4"
                      d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.92c1.71-1.57 2.68-3.89 2.68-6.61z"
                    />
                    <path
                      fill="#34A853"
                      d="M9 18c2.43 0 4.47-.8 5.96-2.19l-2.92-2.26c-.8.54-1.83.86-3.04.86-2.34 0-4.33-1.58-5.04-3.71H.95v2.33A8.997 8.997 0 0 0 9 18z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M3.96 10.7a5.41 5.41 0 0 1 0-3.4V4.97H.95a8.996 8.996 0 0 0 0 8.06l3.01-2.33z"
                    />
                    <path
                      fill="#EA4335"
                      d="M9 3.58c1.32 0 2.51.45 3.44 1.35l2.58-2.59C13.46.86 11.43 0 9 0A8.997 8.997 0 0 0 .95 4.97l3.01 2.33c.71-2.13 2.7-3.72 5.04-3.72z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Divider */}
                <div className="rs-auth-divider">
                  <span className="rs-auth-div-line" />
                  <span className="rs-auth-div-text">or continue with email</span>
                  <span className="rs-auth-div-line" />
                </div>

                {/* Email / Password Form */}
                <form onSubmit={submit} className="rs-auth-form" noValidate>
                  <div className="rs-auth-field">
                    <label htmlFor="auth-email" className="rs-auth-label">
                      Email address
                    </label>
                    <div className="rs-auth-input-wrap">
                      <Mail size={17} className="rs-auth-input-icon" aria-hidden="true" />
                      <input
                        id="auth-email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        placeholder="name@example.com"
                        className="rs-auth-input"
                      />
                    </div>
                  </div>

                  <div className="rs-auth-field">
                    <label htmlFor="auth-password" className="rs-auth-label">
                      Password
                    </label>
                    <div className="rs-auth-input-wrap">
                      <Lock size={17} className="rs-auth-input-icon" aria-hidden="true" />
                      <input
                        id="auth-password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        minLength={8}
                        autoComplete={mode === "sign-in" ? "current-password" : "new-password"}
                        placeholder={
                          mode === "sign-in" ? "Enter your password" : "Create password (8+ characters)"
                        }
                        className="rs-auth-input rs-auth-input--with-toggle"
                      />
                      <button
                        type="button"
                        className="rs-password-toggle"
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? "Hide password" : "Show password"}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="rs-auth-submit-btn"
                    disabled={busy}
                  >
                    {busy ? (
                      <span className="rs-btn-loading-state">
                        <span className="rs-spinner" />
                        {mode === "sign-in" ? "Signing in…" : "Creating account…"}
                      </span>
                    ) : (
                      <span>
                        {mode === "sign-in" ? "Sign in to RaktaSetu" : "Create RaktaSetu Account"}
                      </span>
                    )}
                  </button>
                </form>

                {/* Secondary Actions */}
                <div className="rs-auth-secondary-actions">
                  <button
                    type="button"
                    className="rs-magic-link-btn"
                    onClick={magicLink}
                    disabled={busy || !email}
                  >
                    Email me a passwordless magic link
                  </button>

                  <p className="rs-switch-mode-text">
                    {mode === "sign-in" ? (
                      <>
                        Don&apos;t have an account?{" "}
                        <button
                          type="button"
                          className="rs-switch-mode-btn"
                          onClick={() => {
                            setMode("sign-up");
                            setStatus("");
                          }}
                        >
                          Create one
                        </button>
                      </>
                    ) : (
                      <>
                        Already have an account?{" "}
                        <button
                          type="button"
                          className="rs-switch-mode-btn"
                          onClick={() => {
                            setMode("sign-in");
                            setStatus("");
                          }}
                        >
                          Sign in
                        </button>
                      </>
                    )}
                  </p>
                </div>

                {/* Notification / Status Banner */}
                {message && (
                  <div
                    className={`rs-auth-status-banner ${
                      tone === "error"
                        ? "rs-auth-status-banner--error"
                        : tone === "success"
                        ? "rs-auth-status-banner--success"
                        : "rs-auth-status-banner--info"
                    }`}
                    role="status"
                  >
                    {tone === "error" ? (
                      <AlertCircle size={16} />
                    ) : tone === "success" ? (
                      <CheckCircle2 size={16} />
                    ) : null}
                    <span>{message}</span>
                  </div>
                )}

                {/* Security Message beneath form */}
                <div className="rs-auth-security-note">
                  <ShieldCheck size={16} className="rs-security-icon" aria-hidden="true" />
                  <span>
                    RaktaSetu encrypts authentication credentials and keeps contact information private.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function AuthPage() {
  return (
    <Suspense>
      <AuthForm />
    </Suspense>
  );
}
