import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fintra — AI Finance Tracker",
    short_name: "Fintra",
    description:
      "Tell Fintra what you spent. It logs it and shows you where your money goes.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#f7f4ec",
    theme_color: "#2e5f4c",
    orientation: "portrait",
    categories: ["finance", "productivity"],
    // Long-press the installed icon → straight into logging an expense.
    shortcuts: [
      {
        name: "Add expense",
        short_name: "Add",
        description: "Log an expense",
        url: "/dashboard?add=1",
        icons: [{ src: "/icon-192.png", sizes: "192x192", type: "image/png" }],
      },
    ],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
