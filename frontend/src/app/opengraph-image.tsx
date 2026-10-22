import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";

export const alt = "Kilotrace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          gap: 24,
          padding: 80,
          background: "#07110b",
          color: "#fafafa",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 800, fontStyle: "italic", letterSpacing: 2, textTransform: "uppercase", color: "#22c55e" }}>
          {siteConfig.name}
        </div>
        <div style={{ fontSize: 88, fontWeight: 700, lineHeight: 1.05 }}>Chaque sortie dessine votre carte</div>
        <div style={{ fontSize: 32, color: "#a3a3a3" }}>Tuiles, gares, pays et badges à compléter, une sortie à la fois.</div>
      </div>
    ),
    size,
  );
}
