import { ImageResponse } from "next/og";

export const alt = "Wayra · Paquetes y tours en Perú";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Tokens de docs/DESIGN-SYSTEM.md: dark #0B1513, accent #C2410C, texto blanco.
export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 96px",
          background: "#0B1513",
          color: "#FFFFFF",
        }}
      >
        <div style={{ width: 120, height: 12, background: "#C2410C", marginBottom: 40 }} />
        <div style={{ fontSize: 160, fontWeight: 700, lineHeight: 1 }}>Wayra</div>
        <div style={{ fontSize: 48, marginTop: 24 }}>Paquetes y tours en Perú</div>
      </div>
    ),
    size,
  );
}
