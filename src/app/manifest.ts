import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Fintra — AI Finance Tracker",
    short_name: "Fintra",
    description:
      "Tell Fintra what you spent. It logs it and shows you where your money goes.",
    start_url: "/dashboard",
    display: "standalone",
    background_color: "#0b0b12",
    theme_color: "#5b52e8",
    orientation: "portrait",
    categories: ["finance", "productivity"],
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml" },
    ],
  };
}
