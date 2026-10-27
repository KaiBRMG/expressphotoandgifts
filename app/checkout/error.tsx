"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import "@/app/site/lost.css";

import { useWhatsApp } from "@/app/site/ContactContext";
import { ArrowRight, WhatsApp } from "@/app/site/icons";

/**
 * A checkout step that didn't load. It sits inside checkout's own layout, so the
 * bar, footer and cart are the shop's. Unlike the site-wide `error.tsx` it can't
 * say nothing was charged: the receipt and the details step are where a customer
 * lands straight from PayFast, and a payment may have gone through behind a page
 * that wouldn't draw. So it says not to pay again, where the receipt is, and
 * carries the order reference when the address has one.
 */
export default function CheckoutError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const whatsapp = useWhatsApp();
  const ref = useSearchParams().get("ref")?.slice(0, 40) || null;

  useEffect(() => {
    console.error(error);
  }, [error]);

  const hello = ref ? `Hi! My order ${ref} wouldn’t load on your website.` : "Hi! A checkout page on your website wouldn’t load.";

  return (
    <section className="lost" role="alert">
      <div className="shell lost__inner">
        <h1 className="lost__title">This step didn’t load.</h1>
        <p className="lost__text">
          If you’ve just paid, please don’t pay again. PayFast tells us the moment a payment goes through, and the email we send you then has a link to your receipt. If you haven’t paid, your cart is still
          here: try again.
        </p>

        <div className="lost__actions">
          <button type="button" className="btn btn--blue" onClick={() => retry()}>
            Try again
          </button>
          <a className="lost__link" href={whatsapp(hello)} target="_blank" rel="noreferrer">
            <WhatsApp size={19} />
            Message us on WhatsApp
          </a>
          <Link className="lost__link" href="/shop">
            Go to the shop
            <ArrowRight size={18} />
          </Link>
        </div>

        {ref ? <p className="lost__ref">Order {ref}</p> : null}
        {error.digest ? <p className="lost__ref">Reference {error.digest}</p> : null}
      </div>
    </section>
  );
}
