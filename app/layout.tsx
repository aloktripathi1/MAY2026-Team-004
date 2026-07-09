import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Sangam: the confluence for IITM BS clubs",
  description:
    "One place for IITM BS student clubs and societies to run members, events, tasks and announcements. No more scattered WhatsApp threads and Google Forms.",
  authors: [{ name: "Team Dhurandhar" }],
  icons: { icon: "/favicon.ico" },
  openGraph: {
    title: "Sangam: the confluence for IITM BS clubs",
    description: "Members, events, tasks, announcements: one confluence for every IITM BS society.",
    type: "website",
  },
  twitter: { card: "summary_large_image" },
};

export const viewport = {
  themeColor: "#7a1a1a",
};

export const dynamic = "force-dynamic";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
