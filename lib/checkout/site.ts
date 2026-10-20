import "server-only";

/** The shop's public address (SITE_URL), without a trailing slash: where PayFast and emails link back to. Null when unset. */
export const siteUrl = () => process.env.SITE_URL?.trim().replace(/\/$/, "") || null;
