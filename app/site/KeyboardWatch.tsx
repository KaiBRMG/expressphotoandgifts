"use client";

import { useEffect } from "react";

/** Inputs that bring up the on-screen keyboard (or iOS's picker), as opposed to ticks, buttons and file choosers. */
const NO_KEYBOARD = new Set(["checkbox", "radio", "button", "submit", "reset", "file", "range", "color", "image", "hidden"]);

function bringsKeyboard(el: Element | null): boolean {
  if (el instanceof HTMLInputElement) return !NO_KEYBOARD.has(el.type) && !el.readOnly;
  if (el instanceof HTMLTextAreaElement) return !el.readOnly;
  return el instanceof HTMLSelectElement || (el instanceof HTMLElement && el.isContentEditable);
}

/**
 * Marks the page `data-keyboard` while a phone's on-screen keyboard is up, so
 * whatever is docked to the foot of the screen (the order dock, Add to cart,
 * checkout's tray and slip, the console's tab and save bars) steps out of the
 * way instead of riding on top of the keys, as iOS keeps a fixed bar in view
 * above the keyboard. Each bar's own stylesheet says how it steps aside.
 *
 * Up means a field that types has focus on a touch screen. It is down again
 * when focus leaves, or when the visible viewport grows back to full height
 * after shrinking (Android's back button closes the keyboard and leaves the
 * field focused). Mounted once, in the root layout.
 */
export function KeyboardWatch() {
  useEffect(() => {
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    const root = document.documentElement;
    const vv = window.visualViewport;
    let shrunk = false;
    let frame = 0;
    const full = () => !vv || vv.height * vv.scale >= window.innerHeight * 0.9;
    const update = () => {
      const typing = bringsKeyboard(document.activeElement);
      if (!typing) shrunk = false;
      else if (!full()) shrunk = true;
      root.toggleAttribute("data-keyboard", typing && !(shrunk && full()));
    };
    // Moving from one field to the next blurs before it focuses, so judge once both have happened.
    const later = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(update);
    };
    document.addEventListener("focusin", later);
    document.addEventListener("focusout", later);
    vv?.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", later);
      document.removeEventListener("focusout", later);
      vv?.removeEventListener("resize", update);
      root.removeAttribute("data-keyboard");
    };
  }, []);
  return null;
}
