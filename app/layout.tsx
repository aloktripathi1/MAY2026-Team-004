import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700"],
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Sangam: the confluence for IITM BS clubs",
  description:
    "One place for IITM BS student clubs and societies to run members, events, tasks and announcements. No more scattered WhatsApp threads and Google Forms.",
  authors: [{ name: "Team Dhurandhar" }],
  icons: { icon: "/logo.svg" },
  openGraph: {
    title: "Sangam: the confluence for IITM BS clubs",
    description: "Members, events, tasks, announcements: one confluence for every IITM BS society.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#0A0A0C",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${spaceGrotesk.variable} ${jetBrainsMono.variable}`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
