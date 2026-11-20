import type React from "react";
import { Easing, Img, interpolate, staticFile } from "remotion";
import { loadFont as loadCaslon } from "@remotion/google-fonts/LibreCaslonText";
import { loadFont as loadInter } from "@remotion/google-fonts/Inter";
import { loadFont as loadBarlow } from "@remotion/google-fonts/Barlow";

export const heading = loadCaslon("normal", { weights: ["400", "700"], subsets: ["latin"] }).fontFamily;
export const body = loadInter("normal", { weights: ["400", "500", "600"], subsets: ["latin"] }).fontFamily;
export const button = loadBarlow("normal", { weights: ["900"], subsets: ["latin"] }).fontFamily;

// Tokens de docs/design/identidade-visual.md
export const c = {
  brand: "#C41E3A",
  brandStrong: "#8B1528",
  brandOnDark: "#E63946",
  ink: "#111111",
  inkMuted: "#5C5C5C",
  paper: "#FAF7F2",
  paper2: "#EFE9E0",
  surface: "#FFFFFF",
  line: "#E5E1DA",
  onInkMuted: "#BDB8B0",
  lineOnInk: "#333333",
  success: "#1E7F4F",
};

export const ease = Easing.bezier(0.16, 1, 0.3, 1);
export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** 0 → 1 entre start e start+dur, com a curva de chegada da marca. */
export const prog = (frame: number, start: number, dur = 18) =>
  interpolate(frame, [start, start + dur], [0, 1], { ...clamp, easing: ease });

/** Entrada padrão: sobe e aparece. */
export const rise = (frame: number, start: number, dist = 40, dur = 18): React.CSSProperties => {
  const p = prog(frame, start, dur);
  return { opacity: p, translate: `0 ${(1 - p) * dist}px` };
};

/** Saída suave no fim da cena. */
export const exitFade = (frame: number, duration: number, len = 10) =>
  interpolate(frame, [duration - len, duration], [1, 0], clamp);

export const Img2: React.FC<{ src: string; style?: React.CSSProperties }> = ({ src, style }) => (
  <Img src={staticFile(src.includes("/") ? src : `img/${src}`)} style={{ display: "block", ...style }} />
);

export const Browser: React.FC<{
  width: number;
  children: React.ReactNode;
  style?: React.CSSProperties;
  dark?: boolean;
}> = ({ width, children, style, dark }) => {
  const height = (width * 720) / 1280;
  return (
    <div
      style={{
        width,
        background: c.surface,
        boxShadow: "0 40px 90px rgba(0,0,0,0.35), 0 0 0 1px rgba(0,0,0,0.08)",
        borderRadius: 14,
        overflow: "hidden",
        ...style,
      }}
    >
      <div
        style={{
          height: 44,
          background: dark ? "#1d1d1d" : "#ECE7DF",
          display: "flex",
          alignItems: "center",
          gap: 9,
          padding: "0 18px",
        }}
      >
        {["#FF5F57", "#FEBC2E", "#28C840"].map((col) => (
          <div key={col} style={{ width: 13, height: 13, borderRadius: 7, background: col }} />
        ))}
        <div
          style={{
            marginLeft: 22,
            flex: 1,
            maxWidth: 520,
            height: 26,
            borderRadius: 13,
            background: dark ? "#2b2b2b" : "#FAF7F2",
            color: dark ? "#9a958e" : c.inkMuted,
            fontFamily: body,
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            paddingLeft: 14,
            gap: 8,
          }}
        >
          <span style={{ fontSize: 12 }}>🔒</span> Augusto Barbearia
        </div>
      </div>
      <div style={{ width, height, position: "relative", overflow: "hidden" }}>{children}</div>
    </div>
  );
};

export const Phone: React.FC<{ src: string; scale?: number; style?: React.CSSProperties }> = ({
  src,
  scale = 1.15,
  style,
}) => {
  const w = 390 * scale;
  const h = 720 * scale;
  return (
    <div
      style={{
        padding: 16,
        background: "#0b0b0b",
        borderRadius: 64,
        boxShadow: "0 50px 100px rgba(0,0,0,0.55), inset 0 0 0 2px #3a3a3a",
        position: "relative",
        ...style,
      }}
    >
      <div style={{ width: w, height: h, borderRadius: 48, overflow: "hidden", position: "relative" }}>
        <Img2 src={src} style={{ width: w, height: h, objectFit: "cover", objectPosition: "top" }} />
      </div>
      <div
        style={{
          position: "absolute",
          top: 28,
          left: "50%",
          translate: "-50% 0",
          width: 120,
          height: 34,
          borderRadius: 17,
          background: "#0b0b0b",
        }}
      />
    </div>
  );
};

/** Bigode entre duas linhas, o ornamento do hero. */
export const Ornament: React.FC<{ p: number; color?: string; align?: "center" | "flex-start" }> = ({ p, color = c.brandOnDark, align = "center" }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 18, justifyContent: align }}>
    <div style={{ height: 3, width: 140 * p, background: color }} />
    <svg width="90" height="30" viewBox="0 0 90 30" style={{ opacity: p }}>
      <path
        d="M45 12 C38 2, 22 4, 14 12 C10 16, 4 16, 1 12 C4 22, 18 26, 30 20 C37 17, 42 15, 45 15 C48 15, 53 17, 60 20 C72 26, 86 22, 89 12 C86 16, 80 16, 76 12 C68 4, 52 2, 45 12 Z"
        fill={color}
      />
    </svg>
    <div style={{ height: 3, width: 140 * p, background: color }} />
  </div>
);

export const Check: React.FC<{ color?: string; size?: number }> = ({ color = c.brandOnDark, size = 40 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40">
    <rect x="0" y="0" width="40" height="40" fill={color} />
    <path d="M10 21 L17 28 L31 13" stroke="#fff" strokeWidth="4" fill="none" strokeLinecap="square" />
  </svg>
);
