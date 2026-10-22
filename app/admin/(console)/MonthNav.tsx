import Link from "next/link";
import { shiftMonth } from "@/lib/shopTime";
import { ArrowLeft, ArrowRight } from "@/app/site/icons";

/** "October 2026". */
export const monthName = (month: string) =>
  new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-ZA", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

/** "October": a month's name alone. */
export const shortMonth = (month: string) => new Date(`${month}-01T12:00:00Z`).toLocaleDateString("en-ZA", { month: "long", timeZone: "UTC" });

/** A month page's heading between its previous and next months (`?month=`); no next past this month. */
export function MonthNav({ base, month, current, children }: { base: string; month: string; current: string; children?: React.ReactNode }) {
  const prev = shiftMonth(month, -1);
  const next = shiftMonth(month, 1);
  return (
    <nav className="pay__months" aria-label="Month">
      <Link className="pay__step" href={`${base}?month=${prev}`} aria-label={`Previous month, ${monthName(prev)}`}>
        <ArrowLeft size={20} />
      </Link>
      <h2 className="pay__month">
        {monthName(month)}
        {children}
      </h2>
      {month < current ? (
        <Link className="pay__step" href={`${base}?month=${next}`} aria-label={`Next month, ${monthName(next)}`}>
          <ArrowRight size={20} />
        </Link>
      ) : (
        <span className="pay__step pay__step--off" aria-hidden="true">
          <ArrowRight size={20} />
        </span>
      )}
    </nav>
  );
}
