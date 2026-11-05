import { ImageResponse } from "next/og";

export const alt = "RAVANTRA — Everything that makes you, you.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", background: "#211B20", color: "#F8F5EF", padding: 72 }}>
        <div style={{ display: "flex", fontSize: 22, letterSpacing: 8, color: "#B69A72" }}>FASHION · BEAUTY · SALON & SPA · LIFESTYLE</div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, letterSpacing: 28, fontFamily: "serif" }}>RAVANTRA</div>
          <div style={{ fontSize: 44, fontStyle: "italic", color: "#E8DCCB", marginTop: 12, fontFamily: "serif" }}>Everything that makes you, you.</div>
        </div>
        <div style={{ display: "flex", fontSize: 18, color: "#8A7462" }}>Designed &amp; developed by OrbitDevStudio</div>
      </div>
    ),
    size,
  );
}
