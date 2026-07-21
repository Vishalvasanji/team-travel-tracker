"use client";

import Link from "next/link";
import { TEAM_NAME } from "@/lib/roster";
import { PlayerBadge, PlayerGate, PlayerProvider } from "@/lib/player";

export default function Shell({ children }: { children: React.ReactNode }) {
  return (
    <PlayerProvider>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <div>
              <div className="brand-title">{TEAM_NAME}</div>
              <div className="brand-sub">Away Games &amp; Hotel Tracker</div>
            </div>
          </Link>
          <PlayerBadge />
        </div>
      </header>
      <main className="container">
        <PlayerGate>{children}</PlayerGate>
      </main>
      <footer className="site-footer">
        <div className="container">
          Schedule syncs hourly from PlayMetrics · Coming soon: live hotel
          pricing near each field
        </div>
      </footer>
    </PlayerProvider>
  );
}
