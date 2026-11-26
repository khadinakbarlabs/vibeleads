/**
 * iOS home-screen icon (180×180 PNG).
 *
 * Apple Touch Icons must be PNG — SVG isn't supported. We generate one
 * via ImageResponse so the design stays in code (no binary asset to
 * keep in sync). Same chevron + accent peak as app/icon.svg and the
 * components/brand/LogoMark mark.
 */
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgb(139, 109, 240)",
        // Match the rounded-md radius from the LogoMark tile, scaled.
        borderRadius: "32px",
      }}
    >
      <svg
        width="120"
        height="120"
        viewBox="0 0 24 24"
        fill="none"
        stroke="white"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M4 7 L12 19 L20 5" />
        <path d="M16 9 L20 5 L20 11" />
      </svg>
    </div>,
    { ...size },
  );
}
