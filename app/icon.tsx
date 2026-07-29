import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** The seal, at favicon size — the mark the whole product is built around. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          // Satori has no background-clip: text, so the gradient goes on the
          // tile and the mark is knocked out in white.
          background: "linear-gradient(135deg, #2563EB 0%, #14B8A6 55%, #22C55E 100%)",
          borderRadius: 7,
        }}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10.25" stroke="#FFFFFF" strokeWidth="2" />
          <path
            d="M8.4 12.3l2.5 2.5 4.7-5.4"
            stroke="#FFFFFF"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    size,
  );
}
