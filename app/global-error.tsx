"use client";

import { useEffect } from "react";

import { DEFAULT_CONTACT, whatsappLink } from "@/lib/contact";

const blue = "#0126ba";

/**
 * The page for a failure in the root layout itself, which `error.tsx` sits
 * inside and so can't catch. That layout reads the shop's settings and fails the
 * render when they can't be read, so this is the likeliest failure a customer
 * sees. It replaces the whole document: no stylesheet, font, provider or setting
 * is relied on, so the shop's own number is the starting one.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en-ZA">
      <body style={{ margin: 0, color: blue, background: "#fff", fontFamily: "system-ui, sans-serif", lineHeight: 1.5 }}>
        <main role="alert" style={{ maxWidth: "40rem", margin: "0 auto", padding: "4rem 1.25rem" }}>
          <h1 style={{ margin: "0 0 1rem", fontSize: "2.2rem", lineHeight: 1.1, letterSpacing: "-0.03em" }}>The shop didn’t load.</h1>
          <p style={{ margin: "0 0 1.5rem", fontSize: "1.1rem" }}>
            It’s us, not you, and often a dropped connection. Nothing was changed and nothing was charged. Try again, and if it keeps happening, message us.
          </p>
          <button
            type="button"
            onClick={() => retry()}
            style={{ minHeight: 44, padding: "0.8rem 1.6rem", border: 0, borderRadius: 999, background: blue, color: "#fff", font: "inherit", fontWeight: 600, cursor: "pointer" }}
          >
            Try again
          </button>{" "}
          <a href={whatsappLink(DEFAULT_CONTACT, "Hi! Your website wouldn’t load.")} style={{ display: "inline-block", padding: "0.8rem 0.6rem", color: blue, fontWeight: 600 }}>
            Message us on WhatsApp
          </a>
          {error.digest ? <p style={{ marginTop: "2rem", fontFamily: "ui-monospace, monospace" }}>Reference {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
