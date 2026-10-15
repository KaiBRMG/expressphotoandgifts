import { CartDrawer, DockAction } from "./Cart";
import { WhatsApp } from "./icons";
import { CHAT_HREF } from "./data";

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
 * buttons of its own, so this pair is the page's only standing action. At the
 * foot of the page it comes to rest in the footer's last row, which is sized
 * for it.
 *
 * Inside the shop the pill would point at the page it is on, so there the dock
 * is the WhatsApp mark alone (`shopAction={false}`).
 *
 * Once the cart holds something the pill is the cart instead, at every width
 * and on every page, carrying the count of units and opening the drawer.
 */
export function OrderDock({ shopAction = true }: { shopAction?: boolean }) {
  return (
    <>
      <div className="dock">
        <div className="dock__inner">
          <DockAction shopAction={shopAction} />

          <a
            className="dock__chat"
            href={CHAT_HREF}
            aria-label="Message the shop on WhatsApp"
          >
            <WhatsApp size={21} />
          </a>
        </div>
      </div>
      <CartDrawer />
    </>
  );
}
