import { ImageResponse } from "next/og";
import { SITE } from "@/lib/site";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = `${SITE.name} — ratings backed by receipts`;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #DBEAFE 0%, #FFFFFF 45%, #CCFBF1 78%, #DCFCE7 100%)",
          padding: 72,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <Stamp />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: "#1F2937" }}>
              {SITE.name}
            </span>
            <span style={{ fontSize: 22, color: "#2563EB" }}>
              {SITE.brandTagline}
            </span>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <span
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "#1F2937",
              letterSpacing: -2,
            }}
          >
            Ratings backed
          </span>
          <span
            style={{
              fontSize: 84,
              fontWeight: 700,
              color: "#15803D",
              letterSpacing: -2,
            }}
          >
            by receipts.
          </span>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 24,
            borderTop: "3px solid #2563EB",
            paddingTop: 28,
          }}
        >
          <span style={{ fontSize: 28, color: "#6B7280" }}>
            Google asks “did you visit?”
          </span>
          <span style={{ fontSize: 28, color: "#1F2937" }}>
            We ask “can you prove it?”
          </span>
        </div>
      </div>
    ),
    size,
  );
}

function Stamp() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10.25" stroke="#15803D" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="7.75" stroke="#15803D" strokeWidth="1" opacity="0.45" />
      <path
        d="M8.4 12.3l2.5 2.5 4.7-5.4"
        stroke="#15803D"
        strokeWidth="1.9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
