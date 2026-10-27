"use client";

import { Tooltip } from "@mantine/core";
import { Info } from "@/app/site/icons";

/**
 * A circled "i" beside a label, for what the label can't say in a word or
 * two. It opens on hover, focus and tap, and a screen reader hears the same
 * words as part of the button, so nothing is only in the tooltip.
 */
export function Tip({ children, about }: { children: string; about: string }) {
  return (
    <Tooltip label={children} events={{ hover: true, focus: true, touch: true }}>
      <button type="button" className="tip">
        <Info size={16} />
        <span className="visually-hidden">
          About {about}: {children}
        </span>
      </button>
    </Tooltip>
  );
}

/**
 * The name of an icon-only control, on hover and keyboard focus. The control
 * keeps its own aria-label, so a screen reader hears it once; on a touch screen
 * the icon is all there is to press, so no tooltip opens.
 */
export function Hint({ label, children }: { label: string; children: React.ReactElement }) {
  return (
    <Tooltip label={label} openDelay={300} events={{ hover: true, focus: true, touch: false }}>
      {children}
    </Tooltip>
  );
}
