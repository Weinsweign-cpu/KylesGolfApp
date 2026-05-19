import type { Metadata } from "next";
import { Syne, IBM_Plex_Sans, IBM_Plex_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import FloatingButton from "@/components/ask/FloatingButton";
import "./globals.css";

const syne = Syne({ variable: "--font-display", subsets: ["latin"], weight: ["400", "500", "600", "700"] });
const ibmSans = IBM_Plex_Sans({ variable: "--font-sans", subsets: ["latin"], weight: ["400", "500", "600"] });
const ibmMono = IBM_Plex_Mono({ variable: "--font-mono", subsets: ["latin"], weight: ["400", "500"] });

export const metadata: Metadata = {
  title: "Kyle's Golf",
  description: "Golf betting tracker",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${syne.variable} ${ibmSans.variable} ${ibmMono.variable} h-full`}>
      <body className="min-h-full" style={{ display: 'flex', flexDirection: 'row', background: 'var(--bg-primary)' }} suppressHydrationWarning>
        <Sidebar />
        <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
          {children}
        </div>
        <FloatingButton />
      </body>
    </html>
  );
}
