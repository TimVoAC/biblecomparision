import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Multilingual Bible Verse Comparison Engine",
  description: "Compare Vietnamese, Greek, and Hebrew Bible versions side-by-side",
};

export default function RootLayout({
  children,
}: RootLayoutProps) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

interface RootLayoutProps {
  children: React.ReactNode;
}