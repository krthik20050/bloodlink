"use client";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="shell"><div className="notice notice-error admin-error"><strong>Dashboard unavailable</strong><p>We could not load the restricted operations snapshot.</p><button className="secondary" type="button" onClick={reset}>Try again</button></div></main>;
}
