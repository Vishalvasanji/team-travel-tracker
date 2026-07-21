import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Team Travel Tracker — Louisiana Elite Soccer 14U",
    short_name: "Team Travel",
    description:
      "Away games, hotels, flights & driving plans for Louisiana Elite Soccer 14U.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6fa",
    theme_color: "#4c1d95",
    icons: [
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
