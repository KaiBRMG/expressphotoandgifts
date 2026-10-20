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
 * request's headers, or a server action's `headers()`. Vercel writes this
 * header itself, so a caller can't set it. (Takes the headers, not the
 * request: Next's `headers()` object has a `headers` field of its own, so
 * telling the two apart by shape picks the wrong one.)
 */
export const callerIp = (headers: Pick<Headers, "get">) => headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
