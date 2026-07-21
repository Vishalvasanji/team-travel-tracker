"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";

export default function EnterPage() {
  return (
    <Suspense fallback={<div className="loading">Loading…</div>}>
      <EnterInner />
    </Suspense>
  );
}

function EnterInner() {
  const searchParams = useSearchParams();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!code.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code.trim() }),
      });
      if (!res.ok) {
        setError("That's not the team code — check the team chat and try again.");
        return;
      }
      const next = searchParams.get("next");
      window.location.href = next && next.startsWith("/") ? next : "/";
    } catch {
      setError("Something went wrong — please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="picker card">
      <h2 className="picker-title">Team access</h2>
      <p className="picker-sub">
        Enter the team code to see the travel tracker. It was shared in the
        team chat — ask your manager if you need it.
      </p>
      <div className="link-form" style={{ maxWidth: 340 }}>
        <input
          placeholder="Team code"
          value={code}
          autoFocus
          autoCapitalize="characters"
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
        <div className="link-form-actions">
          <button
            className="btn btn-primary"
            disabled={busy || !code.trim()}
            onClick={submit}
          >
            {busy ? "Checking…" : "Enter"}
          </button>
        </div>
        {error && <div className="save-error">{error}</div>}
      </div>
    </div>
  );
}
