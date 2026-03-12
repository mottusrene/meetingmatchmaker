import type { Metadata } from "next";
import "./globals.css";
import CookieBanner from "../components/CookieBanner";
import content from "../content/en.json";

const { title, description, siteName } = content.metadata;

export const metadata: Metadata = {
  title,
  description,
  icons: { icon: '/favicon.png' },
  openGraph: {
    title,
    description,
    type: "website",
    siteName,
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ['/og-image.png'],
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
