import type { Metadata, Viewport } from "next";
import { TEAM_NAME } from "@/lib/roster";
import Nav from "./nav";
import "./globals.css";

export const metadata: Metadata = {
  title: `${TEAM_NAME} — Away Games & Hotels`,
  description:
    "Track away games, tournaments, and team hotel bookings for BRSC U14 Elite Girls.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="container header-inner">
            <div className="brand">
              <span className="brand-badge">⚽</span>
              <div>
                <div className="brand-title">{TEAM_NAME}</div>
                <div className="brand-sub">Away Games &amp; Hotel Tracker</div>
              </div>
            </div>
            <Nav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="site-footer">
          <div className="container">
            Schedule syncs hourly from PlayMetrics · Coming soon: live hotel
            pricing near each field
          </div>
        </footer>
      </body>
    </html>
  );
}
