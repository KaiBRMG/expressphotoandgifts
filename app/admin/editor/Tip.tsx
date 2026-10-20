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
