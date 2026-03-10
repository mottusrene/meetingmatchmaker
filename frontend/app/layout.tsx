import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "../components/CookieBanner";
import content from "../content/en.json";

const { title, description, siteName } = content.metadata;

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    type: "website",
    siteName,
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
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
