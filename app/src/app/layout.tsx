import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TCG — The Cruise God | Voice-First AI Concierge",
  description: "Find the best spots, source local plugs, and let the AI run your game night — all through natural conversation. Powered by ElevenLabs and Firecrawl.",
  keywords: ["AI concierge", "voice assistant", "party games", "local guide", "ElevenLabs", "Firecrawl", "nightlife", "events"],
  authors: [{ name: "The Cruise God Team" }],
  openGraph: {
    title: "TCG — The Cruise God",
    description: "Voice-first AI that curates vibes, sources local plugs, and hosts savage party games.",
    url: "https://tcg-cruise-god.vercel.app",
    siteName: "The Cruise God",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TCG — The Cruise God",
    description: "Your charismatic AI concierge and game master.",
    creator: "@TCG_CruiseGod",
  },
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0",
  robots: "index, follow",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
