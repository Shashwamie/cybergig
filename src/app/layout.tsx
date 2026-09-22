import type { Metadata, Viewport } from "next";
import { Orbitron, Saira } from "next/font/google";
import "./globals.css";

const saira = Saira({
  variable: "--font-saira",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["500", "700", "900"],
});

export const metadata: Metadata = {
  title: "Gig Tracker",
  description: "Gig dice tracker for the Cyberpunk Trading Card Game.",
  appleWebApp: { capable: true, statusBarStyle: "black-translucent", title: "Gig Tracker" },
};

export const viewport: Viewport = {
  themeColor: "#00000f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${saira.variable} ${orbitron.variable} h-full antialiased`}>
      <body className="h-full overflow-hidden bg-void font-sans text-white">{children}</body>
    </html>
  );
}
