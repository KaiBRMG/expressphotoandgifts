import "server-only";

/**
 * A fixed-window count per caller, held in this server's memory. Each server
 * instance counts on its own and forgets on restart, so it slows a script
 * down rather than stopping a determined one; a firewall rule in front of the
 * host is the hard limit.
 */
export function rateLimit(limit: number, windowMs: number) {
  const hits = new Map<string, { n: number; until: number }>();
  return (caller: string): boolean => {
    const now = Date.now();
    // Swept as it goes, so the map holds only callers in their current window.
    if (hits.size > 10_000) for (const [k, h] of hits) if (h.until <= now) hits.delete(k);
    const h = hits.get(caller);
    if (!h || h.until <= now) {
      hits.set(caller, { n: 1, until: now + windowMs });
      return true;
    }
    h.n++;
    return h.n <= limit;
  };
}

/**
 * The caller's address, as the host's proxy reports it, or null: from a
 * request, or from a server action's `headers()`. Vercel writes this header
 * itself, so a caller can't set it.
 */
export const callerIp = (from: Request | Pick<Headers, "get">) =>
  ("headers" in from ? from.headers : from).get("x-forwarded-for")?.split(",")[0]?.trim() || null;
