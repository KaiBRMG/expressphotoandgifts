"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";

import "./site/chrome.css";
import "./site/lost.css";

import { whatsappLink } from "@/lib/contact";
import { useContact } from "./site/ContactContext";
import { SHOP } from "./site/data";
import { ArrowRight, WhatsApp } from "./site/icons";

/**
 * A page that couldn't load, for a customer. It is drawn in the root layout's
 * place for a page and so keeps that layout's fonts and the shop's contact, but
 * can't draw the footer or the dock, which read the shop's settings on the server
 * and may be what failed: the bar is the logo alone, and the way out is the page's
 * own. Nothing was changed by loading a page. A failure of the layout itself is
 * `global-error.tsx`'s.
 */
export default function PageError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const contact = useContact();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <>
      <header className="header on-dark">
        <div className="header__bar">
          <Link className="header__logo" href="/" aria-label={`${SHOP.name}, home`}>
            <Image src="/logo/new.png" alt={SHOP.name} width={1400} height={200} sizes="(min-width: 62rem) 560px, 280px" loading="eager" />
          </Link>
        </div>
      </header>
      <main id="main" className="lost" role="alert">
        <div className="shell lost__inner">
          <h1 className="lost__title">This page didn’t load.</h1>
          <p className="lost__text">
            It’s us, not you, and often a dropped connection. Nothing was changed and nothing was charged. Try again, and if it keeps happening, message us and we’ll sort it out.
          </p>

          <div className="lost__actions">
            <button type="button" className="btn btn--blue" onClick={() => retry()}>
              Try again
            </button>
            <Link className="lost__link" href="/shop">
              Go to the shop
              <ArrowRight size={18} />
            </Link>
            <a className="lost__link" href={whatsappLink(contact, "Hi! A page on your website wouldn’t load.")} target="_blank" rel="noreferrer">
              <WhatsApp size={19} />
              Message us on WhatsApp
            </a>
          </div>

          {error.digest ? <p className="lost__ref">Reference {error.digest}</p> : null}
        </div>
      </main>
    </>
  );
}
