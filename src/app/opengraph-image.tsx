import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "RAVANTRA — Everything that makes you, you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logo = await readFile(join(process.cwd(), "public/brand/logo-full-light.png"));
  const src = `data:image/png;base64,${logo.toString("base64")}`;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", background: "#211B20", padding: "0 80px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} width={540} height={420} alt="" />
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 420, color: "#F8F5EF" }}>
          <div style={{ fontSize: 56, fontStyle: "italic", lineHeight: 1.1, fontFamily: "serif" }}>Everything that makes you, you.</div>
          <div style={{ marginTop: 28, fontSize: 20, letterSpacing: 4, color: "#B69A72" }}>FASHION · BEAUTY · SALON &amp; SPA · LIFESTYLE</div>
        </div>
      </div>
    ),
    size,
  );
}
