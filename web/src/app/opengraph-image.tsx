import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { siteTitle } from "@/lib/site";

export const alt = siteTitle;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpenGraphImage() {
  const font = await readFile(
    join(
      process.cwd(),
      "node_modules/@fontsource/dm-sans/files/dm-sans-latin-600-normal.woff",
    ),
  );
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        padding: "66px 80px",
        background: "#f6f6f1",
        color: "#252d29",
        borderTop: "12px solid #245548",
        fontFamily: "DM Sans",
      }}
    >
      <div
        style={{
          display: "flex",
          fontSize: 24,
          color: "#245548",
          marginBottom: 40,
        }}
      >
        INVESTMENT RESEARCH
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 76,
          lineHeight: 1.1,
          letterSpacing: -3,
        }}
      >
        Quantitative Investment
      </div>
      <div
        style={{
          display: "flex",
          fontSize: 76,
          lineHeight: 1.1,
          letterSpacing: -3,
        }}
      >
        &amp; Risk Analysis
      </div>
      <div
        style={{
          display: "flex",
          marginTop: "auto",
          paddingTop: 24,
          borderTop: "1px solid #818d82",
          fontSize: 26,
          color: "#5c675f",
        }}
      >
        Historical evidence · Methodology · Limitations
      </div>
    </div>,
    {
      ...size,
      fonts: [
        {
          name: "DM Sans",
          data: font.buffer.slice(
            font.byteOffset,
            font.byteOffset + font.byteLength,
          ) as ArrayBuffer,
          weight: 600,
          style: "normal",
        },
      ],
    },
  );
}
