import { ArrowRight, WhatsApp } from "./icons";
import { whatsapp } from "./data";

/**
 * Where the dock's primary action will point. The route does not exist yet,
 * so the control renders as a dead button: right size, right place, no
 * destination. Swap it for `<a href={SHOP_HREF}>` the day /shop ships.
 */
const SHOP_HREF = "/shop";

/** The shop's live channel, until the catalogue and checkout exist. */
const CHAT_HREF = whatsapp("Hi! I have a question about…");

/**
 * The persistent action, docked to the foot of the viewport.
 *
 * The pair floats free at every width, on the shell's right edge, so it shares
 * the page's grid instead of sitting at an arbitrary inset. There is no strip
 * behind it: the two shapes are the whole control, and a ground drawn under
 * them on a phone only walled off the foot of the screen.
 *
 * Two actions, two destinations: the pill goes to the catalogue, the round
 * mark opens WhatsApp. The pill carries an arrow rather than the WhatsApp
 * mark, because it no longer opens that channel and the mark on this page
 * is a promise about where a tap lands.
 *
 * It is visible from the first paint and stays visible — the cover has no
 * buttons of its own, so this pair is the page's only standing action.
 * `Motion` moves it once, at the very foot of the page, so it comes to rest
 * under the colophon instead of crossing the wordmark.
 */
export function OrderDock() {
  return (
    <div className="dock">
      <div className="dock__inner">
        <button
          type="button"
          className="btn btn--gold on-gold dock__cta"
          aria-disabled="true"
          data-href={SHOP_HREF}
        >
          Shop now
          <ArrowRight size={17} />
        </button>

        <a
          className="dock__chat"
          href={CHAT_HREF}
          aria-label="Message the shop on WhatsApp"
        >
          <WhatsApp size={21} />
        </a>
      </div>
    </div>
  );
}
