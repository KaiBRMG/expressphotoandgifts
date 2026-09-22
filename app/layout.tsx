import type { Metadata } from "next";
import { Archivo, Geist_Mono, Montserrat } from "next/font/google";
import "./globals.css";
import { SHOP } from "./site/data";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  display: "swap",
});

/**
 * The footer wordmark only. It is set far heavier and far tighter than
 * anything else on the page, which is the whole point of it.
 *
 * It draws exactly one word at exactly one weight, so it asks for exactly that:
 * pinning `weight` and `style` fetches a single static file instead of the
 * variable italic range, and `preload: false` keeps it out of the head, because
 * a decorative word at the very foot of the page has no business competing for
 * bandwidth with the cover the visitor is actually looking at. It arrives on
 * swap, behind Archivo, which is the correct order for it.
 */
const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
  weight: "700",
  style: "italic",
  display: "swap",
  preload: false,
});

/** Carries the numerals, the section marks and the measured slots. */
const mono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SHOP.name} — photo printing and personalised gifts in Scottburgh`,
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
    <html lang="en-ZA" className={`${archivo.variable} ${mono.variable} ${montserrat.variable} h-full`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
