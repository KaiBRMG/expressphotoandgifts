import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /** The receipt PDF reads its fonts and the logo from disk, which a function doesn't carry unless asked. */
  outputFileTracingIncludes: { "/admin/orders/[ref]/receipt": ["./lib/admin/fonts/*.ttf", "./public/logo/new.png"] },
  /**
   * What a browser is told about every page. No Content-Security-Policy yet:
   * checkout loads PayFast's Onsite window, Cloudinary and Vercel's analytics,
   * and the root layout's inline script would need a nonce, so a policy is a
   * change to test against a real payment, not to ship with these.
   * `frame-ancestors` keeps the shop from being framed (the Onsite window is
   * the shop framing PayFast, which this doesn't touch); the camera,
   * microphone and location are off because nothing here asks for them.
   */
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  /**
   * The shelves the catalogue had before it was regrouped into five, kept
   * alive for links already shared and indexed. Any query (?sort=, ?price=)
   * is carried across.
   */
  async redirects() {
    return [
      { source: "/shop/personalised-gifts", destination: "/shop/photo-gifts", permanent: true },
      { source: "/shop/photos", destination: "/shop/photo-printing", permanent: true },
      { source: "/shop/batteries", destination: "/shop/add-ons?type=batteries", permanent: true },
      // Returns, cancellations and refunds now sit in the terms; emails already sent link to the old page.
      { source: "/refunds-cancellations", destination: "/terms#returns", permanent: true },
      { source: "/shop/snacks", destination: "/shop/add-ons?type=snacks", permanent: true },
    ];
  },
};

export default nextConfig;
