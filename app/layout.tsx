import type { Metadata, Viewport } from "next";
import { TEAM_NAME } from "@/lib/roster";
import Shell from "./shell";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://team-travel.vercel.app"),
  title: `${TEAM_NAME} — Team Travel Tracker`,
  description:
    "Away games, hotels, flights & driving plans for Louisiana Elite Soccer 14U.",
  robots: { index: false, follow: false },
  openGraph: {
    title: `${TEAM_NAME} — Team Travel Tracker`,
    description:
      "Away games, hotels, flights & driving plans for Louisiana Elite Soccer 14U.",
    siteName: "Team Travel Tracker",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
  appleWebApp: {
    capable: true,
    title: "Team Travel",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#4c1d95",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Shell>{children}</Shell>
      </body>
    </html>
  );
}
