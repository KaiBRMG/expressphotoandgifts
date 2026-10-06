import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SHOP } from "./site/data";

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
    <html lang="en-ZA" className={`${archivo.variable} ${mono.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
