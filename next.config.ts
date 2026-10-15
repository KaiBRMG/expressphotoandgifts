import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
      { source: "/shop/snacks", destination: "/shop/add-ons?type=snacks", permanent: true },
    ];
  },
};

export default nextConfig;
