import type { MetadataRoute } from "next";

// Home-screen install info (Android/Chrome). iOS uses apple-icon.png and the appleWebApp metadata.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "CyberGig",
    short_name: "CyberGig",
    description: "Gig dice tracker for the Cyberpunk Trading Card Game.",
    start_url: "/",
    display: "standalone",
    background_color: "#00000f",
    theme_color: "#00000f",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
