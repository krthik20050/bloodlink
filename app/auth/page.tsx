"use client";

import { FormEvent, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AuthPage() {
  const [mode, setMode] = useState<"sign-in" | "sign-up">("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const supabase = createSupabaseBrowserClient();
    const result = mode === "sign-in"
      ? await supabase.auth.signInWithPassword({ email, password })
      : await supabase.auth.signUp({ email, password, options: { emailRedirectTo: `${window.location.origin}/auth/callback` } });
    if (result.error) setMessage(result.error.message);
    else setMessage(mode === "sign-up" ? "Check your email to confirm your account." : "Signed in. You can now create a request or donor profile.");
    setBusy(false);
  }

  async function magicLink() {
    setBusy(true);
    setMessage("");
    const { error } = await createSupabaseBrowserClient().auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setMessage(error?.message ?? "Check your email for a secure sign-in link.");
    setBusy(false);
  }

  async function google() {
    setBusy(true);
    const { error } = await createSupabaseBrowserClient().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (error) {
      setMessage(error.message);
      setBusy(false);
    }
  }

  return <main className="shell"><section className="panel auth-panel">
    <p className="kicker">Your BloodLink account</p>
    <h1>{mode === "sign-in" ? "Welcome back." : "Create your account."}</h1>
    <p>Use an account to manage your donor profile and keep blood requests private.</p>
    <button type="button" className="secondary auth-provider" onClick={google} disabled={busy}>Continue with Google</button>
    <div className="auth-divider"><span>or use email</span></div>
    <form onSubmit={submit}>
      <label className="field">Email<input type="email" value={email} onChange={event => setEmail(event.target.value)} required autoComplete="email" /></label>
      <label className="field">Password<input type="password" value={password} onChange={event => setPassword(event.target.value)} required minLength={8} autoComplete={mode === "sign-in" ? "current-password" : "new-password"} /></label>
      <button disabled={busy}>{busy ? "Working..." : mode === "sign-in" ? "Sign in" : "Create account"}</button>
    </form>
    <button type="button" className="text-button" onClick={magicLink} disabled={busy || !email}>Email me a magic link</button>
    <button type="button" className="text-button" onClick={() => { setMode(mode === "sign-in" ? "sign-up" : "sign-in"); setMessage(""); }}>{mode === "sign-in" ? "Need an account? Create one" : "Already have an account? Sign in"}</button>
    {message && <p className="notice" role="status">{message}</p>}
  </section></main>;
}
