import "server-only";

import { siteUrl } from "@/lib/checkout/site";

/**
 * Vercel Web Analytics, read back for the admin's Analytics page through
 * Vercel's query API (`/v1/query/web-analytics/visits/aggregate`). Needs
 * `VERCEL_API_TOKEN` (a token that can read the project), `VERCEL_PROJECT_ID`
 * (Vercel sets it on its own deployments) and `VERCEL_TEAM_ID`. Production
 * traffic only, by Vercel's default. Vercel counts in UTC days, so a month
 * here is two hours off the shop's.
 */

const API = "https://api.vercel.com/v1/query/web-analytics/visits/aggregate";

const vercelReady = () => !!(process.env.VERCEL_API_TOKEN && process.env.VERCEL_PROJECT_ID);

/** A breakdown's line: its value ("google.com", "/shop/all", "mobile") and its counts. */
export type TrafficRow = { key: string; pageviews: number; visitors: number };

export type Traffic = {
  visitors: number;
  pageviews: number;
  /** Day by day, keyed by Vercel's timestamp (ISO, the date first), the month's days Vercel has. */
  days: TrafficRow[];
  pages: TrafficRow[];
  referrers: TrafficRow[];
  campaigns: TrafficRow[];
  devices: TrafficRow[];
  countries: TrafficRow[];
};

export type TrafficRead = { ok: true; data: Traffic } | { ok: false; reason: "not-set-up" | "off" | "failed"; message: string };

type Row = Record<string, unknown> & { pageviews?: number; visitors?: number };

class VercelError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

/** A month that has ended no longer changes, so its answers are kept for a day; the current month is read fresh. */
async function aggregate(by: string, since: string, until: string, limit: number, closed: boolean): Promise<Row[]> {
  const url = new URL(API);
  url.searchParams.set("projectId", process.env.VERCEL_PROJECT_ID!);
  if (process.env.VERCEL_TEAM_ID) url.searchParams.set("teamId", process.env.VERCEL_TEAM_ID);
  url.searchParams.set("by", by);
  url.searchParams.set("since", since);
  url.searchParams.set("until", until);
  url.searchParams.set("limit", String(limit));
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${process.env.VERCEL_API_TOKEN}` },
    ...(closed ? { next: { revalidate: 86_400 } } : { cache: "no-store" as const }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new VercelError(res.status, body?.error?.message ?? `Vercel answered ${res.status}.`);
  }
  return ((await res.json()) as { data?: Row[] }).data ?? [];
}

const rowOf =
  (key: string) =>
  (r: Row): TrafficRow => ({
    key: String(r[key] ?? "") || "(none)",
    pageviews: Number(r.pageviews ?? 0),
    visitors: Number(r.visitors ?? 0),
  });

/** A month's traffic (from and to are YYYY-MM-DD, inclusive), or why it can't be shown. */
export async function monthTraffic(from: string, to: string, closed: boolean): Promise<TrafficRead> {
  if (!vercelReady())
    return {
      ok: false,
      reason: "not-set-up",
      message: "VERCEL_API_TOKEN and VERCEL_PROJECT_ID aren’t set.",
    };
  try {
    const read = (by: string, limit: number) => aggregate(by, from, to, limit, closed);
    const [[total], days, pages, referrers, campaigns, devices, countries] = await Promise.all([
      read("month", 1),
      read("day", 31),
      read("requestPath", 10),
      read("referrerHostname", 8),
      read("utmCampaign", 6),
      read("deviceType", 4),
      read("country", 6),
    ]);
    const sum = rowOf("timestamp")(total ?? {});
    // The shop's own pages linking to each other aren't a source; visits with no referrer are typed-in or app links.
    const own = siteUrl() ? new URL(siteUrl()!).hostname.replace(/^www\./, "") : null;
    return {
      ok: true,
      data: {
        visitors: sum.visitors,
        pageviews: sum.pageviews,
        days: days.map(rowOf("timestamp")),
        pages: pages.map(rowOf("requestPath")),
        referrers: referrers.map(rowOf("referrerHostname")).filter((r) => !own || r.key.replace(/^www\./, "") !== own),
        campaigns: campaigns.map(rowOf("utmCampaign")).filter((r) => r.key !== "(none)"),
        devices: devices.map(rowOf("deviceType")),
        countries: countries.map(rowOf("country")),
      },
    };
  } catch (e) {
    if (e instanceof VercelError && e.status === 404)
      return {
        ok: false,
        reason: "off",
        message: "Web Analytics isn’t switched on for this project in Vercel.",
      };
    return {
      ok: false,
      reason: "failed",
      message: e instanceof Error ? e.message : "Vercel couldn’t be reached.",
    };
  }
}
