"use client";

import { useWhatsApp } from "./ContactContext";
import { WhatsApp } from "./icons";

/**
 * What a customer sees on asking for more than the shop has: the most they
 * can order now, and two ways on, side by side: take that many and carry on,
 * or ask the shop on WhatsApp, with the message already written. On the
 * product page and on a line of the cart; the exact count is only ever shown
 * here, to someone who asked for more.
 */
export function StockLimit({
  room,
  max,
  wanted,
  what,
  sku,
  takeLabel,
  onTake,
}: {
  /** How many more can go in the cart: the limit, less what is already there. */
  room: number;
  /** How many the shop can sell now. */
  max: number;
  /** How many the customer asked for in all. */
  wanted: number;
  /** "Coffee Mug (11oz)". */
  what: string;
  sku: string;
  /** "Order 4", "Add 4 to cart". */
  takeLabel: string;
  onTake: () => void;
}) {
  const wa = useWhatsApp();
  const message = `Hi! I'd like ${wanted} × ${what} (code ${sku}), but the site says only ${max} ${max === 1 ? "is" : "are"} available right now. Could you get more for me, and by when?`;
  // An alert, not a status: the block is added to the page with its words in it,
  // which a polite region often leaves unannounced, and checkout waits on the answer.
  return (
    <div className="limit" role="alert">
      <p className="limit__say">
        <strong>Only {max} available right now.</strong>{" "}
        {room > 0 ? `You asked for ${wanted}.` : `${max === 1 ? "It’s" : "They’re all"} in your cart already.`}
      </p>
      <div className="limit__ways">
        {room > 0 ? (
          <button type="button" className="limit__take" onClick={onTake}>
            {takeLabel}
          </button>
        ) : null}
        <a className="limit__ask" href={wa(message)} target="_blank" rel="noopener">
          <WhatsApp size={19} />
          Ask on WhatsApp
        </a>
      </div>
    </div>
  );
}
