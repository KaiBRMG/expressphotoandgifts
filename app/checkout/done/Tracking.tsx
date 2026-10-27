"use client";

import type { ReactNode } from "react";

import { estimateText, eventWords, momentText, type StepState, type Tracking } from "@/lib/checkout/tracking";
import { useContact } from "@/app/site/ContactContext";
import { Alert, Check } from "@/app/site/icons";

/** What a screen reader hears after each step's name. */
const HEARD: Record<StepState, string> = { done: ", done", now: ", happening now", next: ", still to come" };

/**
 * Where the order is: the shop's steps and the courier's in one line, the
 * step happening now marked, and every update The Courier Guy has sent
 * beside it once the parcel is booked.
 */
export function OrderTracking({ t, id = "track-title", title = "Where your order is", foot }: { t: Tracking; id?: string; title?: ReactNode; foot?: ReactNode }) {
  const c = t.courier;
  const shop = useContact();
  return (
    <section className={`track${c ? " track--courier" : ""}`} aria-labelledby={id}>
      <div className="track__main">
        <h2 id={id} className="costep__title">
          {title}
        </h2>
        <p className={`track__now${t.problem ? " track__now--problem" : ""}`} role="status">
          {t.problem ? <Alert size={20} /> : null}
          {t.headline}
        </p>
        {t.problem ? (
          <p className="receipt__soft">
            Call the shop on <a className="inline-link" href={`tel:+${shop.phoneE164}`}>{shop.phoneDisplay}</a> and we&rsquo;ll sort it out with the courier.
          </p>
        ) : null}

        <ol className="tsteps">
          {t.steps.map((s) => (
            <li key={s.key} className={`tsteps__step tsteps__step--${s.state}`} aria-current={s.state === "now" ? "step" : undefined}>
              <span className="tsteps__dot" aria-hidden="true">
                {s.state === "done" ? <Check size={14} /> : null}
              </span>
              <span className="tsteps__body">
                <span className="tsteps__label">
                  {s.label}
                  <span className="visually-hidden">{HEARD[s.state]}</span>
                </span>
                {s.state !== "next" && s.at ? <time className="tsteps__at" dateTime={s.at}>{momentText(s.at)}</time> : null}
                {s.state === "now" && s.note ? <span className="tsteps__note">{s.note}</span> : null}
                {s.key === "delivered" && s.state !== "done" && c?.estimate ? <span className="tsteps__note">The Courier Guy expects to deliver {estimateText(c.estimate)}.</span> : null}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {c ? (
        <div className="track__courier">
          <dl className="track__facts">
            <div>
              <dt>The Courier Guy tracking number</dt>
              <dd className="track__waybill">{c.tracking}</dd>
            </div>
            {c.estimate ? (
              <div>
                <dt>Expected</dt>
                <dd>{estimateText(c.estimate)}</dd>
              </div>
            ) : null}
          </dl>
          <h3 className="track__sub">Updates from the courier</h3>
          {c.events.length ? (
            <ol className="track__events">
              {c.events.map((e) => (
                <li key={e.at + e.status}>
                  <span className="track__event">{eventWords(e.status)}</span>
                  <span className="receipt__soft">
                    <time dateTime={e.at}>{momentText(e.at)}</time>
                    {e.location ? `, ${e.location}` : ""}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="receipt__soft">Nothing yet. Updates appear here as soon as the courier scans your parcel.</p>
          )}
          {c.checkedAt ? <p className="receipt__soft track__checked">Last heard from the courier {momentText(c.checkedAt)}.</p> : null}
        </div>
      ) : null}
      {foot ? <div className="track__foot">{foot}</div> : null}
    </section>
  );
}
