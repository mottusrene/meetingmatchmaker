import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "../components/CookieBanner";

export const metadata: Metadata = {
  title: "Matchmaking MVP",
  description: "Simplest way to connect at events",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        <CookieBanner />
      </body>
    </html>
  );
}
