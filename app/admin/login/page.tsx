"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ponytail: thin form over existing POST /api/admin/demo-login, no auth lib.
export default function AdminLoginPage() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    setBusy(false);
    if (!res.ok) {
      setError("Invalid admin credentials.");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  return (
    <main className="shell" style={{ maxWidth: 440, paddingTop: 80 }}>
      <Link href="/" className="brand">BloodLink</Link>
      <h1>Admin login</h1>
      <p className="lede compact">Prototype login — local demo credentials only.</p>
      <form onSubmit={submit} className="panel" style={{ display: "grid", gap: 12 }}>
        <label>Login<input value={login} onChange={e => setLogin(e.target.value)} autoComplete="username" required /></label>
        <label>Password<input type="password" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" required /></label>
        {error && <p role="alert" style={{ color: "red" }}>{error}</p>}
        <button type="submit" disabled={busy}>{busy ? "Signing in…" : "Sign in as admin"}</button>
      </form>
    </main>
  );
}
