"use client";

import { useTheme } from "@/context/ThemeContext";

export default function HelloKittyBanner() {
  const { theme } = useTheme();
  if (theme !== "hello-kitty") return null;

  return (
    <div style={{
      background: "linear-gradient(180deg, #ffb6d9 0%, #ffd6e7 60%, #fff0f5 100%)",
      borderBottom: "2px solid #f4a8c8",
      overflow: "hidden",
      height: 90,
      position: "relative",
      display: "flex",
      alignItems: "flex-end",
      justifyContent: "center",
    }}>
      {/* Scattered hearts background */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox="0 0 1200 90"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Row of hearts across the top */}
        {[30,80,140,200,270,330,400,460,530,600,660,730,800,860,930,990,1060,1120,1180].map((x, i) => (
          <path
            key={i}
            d={`M${x} ${10 + (i % 3) * 8} c0 0 -5-4-5-7 0-3 2-5 4-4.5 1 .3 2 1.5 1 2.5l4 3.5 4-3.5c-1-1 0-2.2 1-2.5 2-.5 4 1.5 4 4.5 0 3-5 7-5 7z`}
            fill="#e91e8c"
            opacity={0.25 + (i % 4) * 0.12}
            transform={`scale(${0.8 + (i % 3) * 0.2})`}
            style={{ transformOrigin: `${x}px 14px` }}
          />
        ))}

        {/* Row of smaller hearts lower */}
        {[55,115,185,245,310,375,445,510,575,635,700,765,835,900,965,1030,1095,1155].map((x, i) => (
          <path
            key={`b${i}`}
            d={`M${x} ${38 + (i % 4) * 6} c0 0 -4-3-4-5.5 0-2.5 1.5-4 3-3.5 .8 .2 1.5 1 1.5 1.5 0-.5.7-1.3 1.5-1.5 1.5-.5 3 1 3 3.5 0 2.5-4 5.5-4 5.5z`}
            fill="#c2185b"
            opacity={0.18 + (i % 3) * 0.1}
          />
        ))}
      </svg>

      {/* Hello Kitty faces row */}
      <svg
        style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)" }}
        width="900"
        height="75"
        viewBox="0 0 900 75"
      >
        {/* 7 Hello Kitty faces evenly spaced */}
        {[80, 195, 310, 450, 590, 705, 820].map((cx, i) => (
          <KittyFace key={i} cx={cx} cy={65} size={i === 3 ? 1.15 : 0.9 + (i % 2) * 0.1} />
        ))}
      </svg>
    </div>
  );
}

function KittyFace({ cx, cy, size = 1 }: { cx: number; cy: number; size?: number }) {
  const s = size;
  const r = 22 * s;   // head radius
  const earH = 12 * s; // ear height

  return (
    <g transform={`translate(${cx}, ${cy})`}>
      {/* Left ear */}
      <ellipse cx={-16 * s} cy={-r - earH * 0.4} rx={9 * s} ry={earH * s} fill="#fff" stroke="#f4a8c8" strokeWidth={1.5} />
      <ellipse cx={-16 * s} cy={-r - earH * 0.4} rx={5 * s} ry={earH * 0.6 * s} fill="#ffb6d9" />
      {/* Right ear */}
      <ellipse cx={16 * s} cy={-r - earH * 0.4} rx={9 * s} ry={earH * s} fill="#fff" stroke="#f4a8c8" strokeWidth={1.5} />
      <ellipse cx={16 * s} cy={-r - earH * 0.4} rx={5 * s} ry={earH * 0.6 * s} fill="#ffb6d9" />

      {/* Head */}
      <ellipse cx={0} cy={-r * 0.15} rx={r} ry={r * 0.95} fill="#fff" stroke="#f4a8c8" strokeWidth={1.5} />

      {/* Bow — top right */}
      <g transform={`translate(${14 * s}, ${-r - 2 * s})`}>
        {/* Left lobe */}
        <ellipse cx={-7 * s} cy={0} rx={7 * s} ry={4 * s} fill="#e91e8c" transform="rotate(-20)" />
        {/* Right lobe */}
        <ellipse cx={7 * s} cy={0} rx={7 * s} ry={4 * s} fill="#e91e8c" transform="rotate(20)" />
        {/* Center knot */}
        <ellipse cx={0} cy={0} rx={3.5 * s} ry={3.5 * s} fill="#c2185b" />
        {/* Bow shine */}
        <ellipse cx={-7 * s} cy={-1 * s} rx={3 * s} ry={2 * s} fill="#f06292" opacity={0.5} transform="rotate(-20)" />
        <ellipse cx={7 * s} cy={-1 * s} rx={3 * s} ry={2 * s} fill="#f06292" opacity={0.5} transform="rotate(20)" />
      </g>

      {/* Eyes — two dots */}
      <ellipse cx={-8 * s} cy={-10 * s} rx={2.5 * s} ry={3 * s} fill="#3d0a1e" />
      <ellipse cx={8 * s} cy={-10 * s} rx={2.5 * s} ry={3 * s} fill="#3d0a1e" />
      {/* Eye shine */}
      <circle cx={-7 * s} cy={-11.5 * s} r={1 * s} fill="#fff" />
      <circle cx={9 * s} cy={-11.5 * s} r={1 * s} fill="#fff" />

      {/* Nose */}
      <ellipse cx={0} cy={-5 * s} rx={2 * s} ry={1.2 * s} fill="#e91e8c" />

      {/* Whiskers left */}
      <line x1={-r + 4 * s} y1={-6 * s} x2={-12 * s} y2={-5 * s} stroke="#dda0b8" strokeWidth={1.2} strokeLinecap="round" />
      <line x1={-r + 4 * s} y1={-2 * s} x2={-12 * s} y2={-2 * s} stroke="#dda0b8" strokeWidth={1.2} strokeLinecap="round" />
      {/* Whiskers right */}
      <line x1={12 * s} y1={-5 * s} x2={r - 4 * s} y2={-6 * s} stroke="#dda0b8" strokeWidth={1.2} strokeLinecap="round" />
      <line x1={12 * s} y1={-2 * s} x2={r - 4 * s} y2={-2 * s} stroke="#dda0b8" strokeWidth={1.2} strokeLinecap="round" />
    </g>
  );
}