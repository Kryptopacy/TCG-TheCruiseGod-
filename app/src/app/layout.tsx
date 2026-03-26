import type { Metadata } from "next";
import { DM_Sans, Russo_One } from "next/font/google";
import "./globals.css";
import AuthButton from "./components/AuthButton";
import { cookies } from 'next/headers';

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["400", "500", "700", "900"],
});

const russoOne = Russo_One({
  subsets: ["latin"],
  variable: "--font-russo",
  weight: ["400"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "TCG — The Cruise God | Voice-First AI Concierge",
  description: "Find the best spots, source local plugs, and let the AI run your game night — all through natural conversation. Powered by ElevenLabs and Firecrawl.",
  keywords: ["AI concierge", "voice assistant", "party games", "local guide", "ElevenLabs", "Firecrawl", "nightlife", "events"],
  authors: [{ name: "The Cruise God Team" }],
  openGraph: {
    title: "TCG — The Cruise God",
    description: "Voice-first AI that curates vibes, sources local plugs, and hosts savage party games.",
    url: "https://thecruisegod.vercel.app/",
    siteName: "The Cruise God",
    locale: "en_US",
    type: "website",
    images: [{ url: "/cover.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "TCG — The Cruise God",
    description: "Your charismatic AI concierge and game master.",
    creator: "@TCG_CruiseGod",
    images: ["/cover.png"],
  },
  robots: "index, follow",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/tcg-logo.png", type: "image/png" }
    ],
    shortcut: [
      { url: "/tcg-logo.png", type: "image/png" }
    ],
    apple: "/tcg-logo.png",
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  // Default to Demo Mode (hidden auth) unless explicitly set to 'false' via the Admin console
  const isDemoMode = cookieStore.get('tcg_demo_mode')?.value !== 'false';

  return (
    <html lang="en" className={`${dmSans.variable} ${russoOne.variable}`}>
      <body className="antialiased">
        {!isDemoMode && <AuthButton />}
        {children}
      </body>
    </html>
  );
}
