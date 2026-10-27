import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowRight } from "@/app/site/icons";

/**
 * One line of a dashboard card: what it is over what to do, the whole line a
 * door. `calm` marks a line that is no trouble (a blue mark, not a red one);
 * `end` is what stands at its right, such as a count, and an arrow when it is
 * left out.
 */
export function GlanceRow({ href, icon, title, text, calm, end, open }: { href: string; icon: ReactNode; title: ReactNode; text?: ReactNode; calm?: boolean; end?: ReactNode; open: string }) {
  return (
    <li>
      <Link href={href} className={`hidden__row${calm ? " hidden__row--ready" : ""}${icon ? "" : " hidden__row--bare"}`}>
        <span className="hidden__why">
          {icon}
          {title}
        </span>
        {text ? <span className="hidden__fix">{text}</span> : null}
        <span className="hidden__n">
          {end ?? <ArrowRight size={18} />}
          <span className="visually-hidden">{open}</span>
        </span>
      </Link>
    </li>
  );
}
