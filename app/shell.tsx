"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { TEAM_NAME } from "@/lib/roster";
import { PlayerBadge, PlayerGate, PlayerProvider } from "@/lib/player";

export default function Shell({ children }: { children: React.ReactNode }) {
  // The access-code page sits before player selection.
  const skipPlayerGate = usePathname() === "/enter";
  return (
    <PlayerProvider>
      <header className="site-header">
        <div className="container header-inner">
          <Link href="/" className="brand">
            <div>
              <div className="brand-title">{TEAM_NAME}</div>
              <div className="brand-sub">Team Travel Tracker</div>
            </div>
          </Link>
          <PlayerBadge />
        </div>
      </header>
      <main className="container">
        {skipPlayerGate ? children : <PlayerGate>{children}</PlayerGate>}
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
