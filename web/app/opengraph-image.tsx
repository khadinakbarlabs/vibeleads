import { ImageResponse } from "next/og";
export const alt = "VibeLeads prospecting workspace";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
        height: "100%",
        padding: 76,
        background: "#f1eefb",
        color: "#211c35",
      }}
    >
      <div style={{ display: "flex", fontSize: 39, fontWeight: 700 }}>
        VibeLeads
      </div>
      <div style={{ display: "flex", fontWeight: 700, fontSize: 86 }}>
        Your prospecting workspace.
      </div>
      <div style={{ display: "flex", color: "#55478b", fontSize: 32 }}>
        Connect your AI agent. Explore your workflow results.
      </div>
    </div>,
    size,
  );
}
