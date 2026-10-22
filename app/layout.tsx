import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SHOP } from "./site/data";
import { SiteAnalytics } from "./site/SiteAnalytics";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/** Carries the numerals, the section marks and the measured slots. */
const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SHOP.name} — photo printing and personalised gifts`,
    template: `%s — ${SHOP.name}`,
  },
  description:
    "A photo and gift shop in Scott Street, Scottburgh. Photo printing, ID photos, print services, framing, albums and personalised photo gifts. Collect in store or have it delivered.",
  metadataBase: new URL("https://expressphotoandgifts.com"),
  openGraph: {
    title: `${SHOP.name} — Scottburgh`,
    description:
      "Photo printing, ID photos, framing and personalised photo gifts, from a real shop in Scott Street, Scottburgh.",
    locale: "en_ZA",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The script below adds a class before first paint, which React would
    // otherwise report as a mismatch on hydration.
    <html
      lang="en-ZA"
      className={`${archivo.variable} ${mono.variable} h-full`}
      suppressHydrationWarning
    >
      <head>
        {/* Holds the cover's headline back until `Motion` takes it over, so
            the server-rendered band does not paint in place and then jump
            off-screen to run in. `Motion` removes the class; home.css shows
            the band anyway after a few seconds if it never does. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if(matchMedia("(prefers-reduced-motion: no-preference)").matches)document.documentElement.classList.add("entrance-pending")`,
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <SiteAnalytics />
      </body>
    </html>
  );
}
