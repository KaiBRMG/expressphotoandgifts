import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { SHOP } from "./site/data";

export const alt = `${SHOP.name}, ${SHOP.town}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/**
 * The preview a shared link shows when its page has no photograph of its own:
 * the shop's wordmark on the brand blue, and where it is. Drawn once at build
 * from the logo and the Archivo the receipt already carries.
 */
export default async function OpengraphImage() {
  const [logo, font] = await Promise.all([readFile(join(process.cwd(), "public/logo/new.png")), readFile(join(process.cwd(), "lib/admin/fonts/Archivo-SemiBold.ttf"))]);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 44, background: "#0126ba", color: "#fff", fontFamily: "Archivo" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:image/png;base64,${logo.toString("base64")}`} width={980} height={140} alt="" />
        <div style={{ display: "flex", fontSize: 44, letterSpacing: -1 }}>Photo printing, framing and personalised gifts</div>
        <div style={{ display: "flex", fontSize: 34, color: "#ffb72a" }}>
          {SHOP.street}, {SHOP.town}
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: "Archivo", data: font, weight: 600, style: "normal" }] },
  );
}
