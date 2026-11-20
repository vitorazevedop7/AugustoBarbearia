import { Audio } from "@remotion/media";
import type React from "react";
import { AbsoluteFill, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Img2, Ornament, Phone, body, button, c, clamp, ease, heading, prog, rise } from "../ui";
import { TIMED, cap, type Box, type Item } from "./timeline";

// Geometria da janela: a captura (1920×1080) aparece a 80%.
const S = 0.8;
const VW = 1920 * S; // 1536
const VH = 1080 * S; // 864
const WX = (1920 - VW) / 2; // 192
const BAR = 40;
const WY = 34;
const CY = WY + BAR; // topo do conteúdo
const CAPTION_Y = CY + VH + 30;

const center = (b: Box) => ({ x: WX + (b.x + b.w / 2) * S, y: CY + (b.y + b.h / 2) * S });
const REST = { x: 1560, y: 860 };

// tempos dentro de um passo com clique
const MOVE_START = 8;
const MOVE_END = 34;
const CLICK = 38;

const fadeIn = (frame: number) => interpolate(frame, [0, 10], [0, 1], clamp);

// ---------------------------------------------------------------- moldura
const Window: React.FC<{ children: React.ReactNode; url: string }> = ({ children, url }) => (
  <div
    style={{
      position: "absolute",
      left: WX,
      top: WY,
      width: VW,
      borderRadius: 12,
      overflow: "hidden",
      background: c.surface,
      boxShadow: "0 30px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)",
    }}
  >
    <div style={{ height: BAR, background: "#232323", display: "flex", alignItems: "center", gap: 8, padding: "0 16px" }}>
      {["#FF5F57", "#FEBC2E", "#28C840"].map((col) => (
        <div key={col} style={{ width: 12, height: 12, borderRadius: 6, background: col }} />
      ))}
      <div
        style={{
          marginLeft: 20,
          width: 560,
          height: 24,
          borderRadius: 12,
          background: "#333",
          color: "#b9b4ad",
          fontFamily: body,
          fontSize: 14,
          display: "flex",
          alignItems: "center",
          paddingLeft: 14,
        }}
      >
        {url}
      </div>
    </div>
    <div style={{ width: VW, height: VH, position: "relative", overflow: "hidden", background: c.paper }}>{children}</div>
  </div>
);

const URLS: Record<string, string> = {
  c01: "/",
  c02: "/",
  c03: "/agendar",
  c04: "/agendar?barbeiro=2",
  c05: "/agendar?barbeiro=2&servico=2",
  c06: "/agendar?barbeiro=2&servico=2&data=…",
  c08: "/entrar?voltar=/agendar…",
  c09: "/agendar?…&hora=14:00",
  c10: "/agendar/confirmado/…",
  c11: "/meus-agendamentos",
  a01: "/entrar",
  a02: "/admin",
  a03: "/admin",
  a04: "/admin/agenda",
  a05: "/admin/agenda?visao=semana",
  a06: "/admin/agenda",
  a08: "/admin/agenda/…",
  a09: "/admin/agenda/…",
  a10: "/admin/agenda/…?aviso=concluido",
  a11: "/admin/relatorio",
};
const urlOf = (shot: string) => "localhost  " + (URLS[shot.slice(0, 3)] ?? "/");

const Caption: React.FC<{ chapter: string; text: string }> = ({ chapter, text }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames - 2], [1, 0], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: WX,
        top: CAPTION_Y,
        width: VW,
        display: "flex",
        alignItems: "center",
        gap: 22,
        ...rise(frame, 6, 16, 14),
        opacity: prog(frame, 6, 14) * out,
      }}
    >
      <div
        style={{
          background: c.brand,
          color: "#fff",
          fontFamily: body,
          fontWeight: 600,
          fontSize: 24,
          padding: "8px 16px",
          whiteSpace: "nowrap",
        }}
      >
        {chapter}
      </div>
      <div style={{ fontFamily: body, fontWeight: 500, fontSize: 34, color: c.paper, whiteSpace: "nowrap" }}>{text}</div>
    </div>
  );
};

// ---------------------------------------------------------------- cursor
const Cursor: React.FC<{ x: number; y: number; press: number; opacity?: number }> = ({ x, y, press, opacity = 1 }) => (
  <svg
    width={44}
    height={52}
    viewBox="0 0 22 26"
    style={{ position: "absolute", left: x - 4, top: y - 2, scale: 1 - 0.15 * press, transformOrigin: "4px 2px", opacity, filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.45))" }}
  >
    <path d="M2 1 L2 20 L7 15.5 L10.5 23.5 L13.8 22 L10.4 14.2 L17 14.2 Z" fill="#111" stroke="#fff" strokeWidth="1.6" strokeLinejoin="round" />
  </svg>
);

const Ripple: React.FC<{ x: number; y: number; t: number }> = ({ x, y, t }) => {
  if (t < 0 || t > 1) return null;
  const r = 14 + 46 * t;
  return (
    <div
      style={{
        position: "absolute",
        left: x - r,
        top: y - r,
        width: r * 2,
        height: r * 2,
        borderRadius: r,
        border: `5px solid ${c.brandOnDark}`,
        opacity: 1 - t,
      }}
    />
  );
};

// ---------------------------------------------------------------- tipos de passo
const ClickStep: React.FC<{ shot: string; from: { x: number; y: number }; fresh: boolean }> = ({ shot, from, fresh }) => {
  const frame = useCurrentFrame();
  const s = cap(shot);
  const box = s.box!;
  const to = center(box);
  const m = interpolate(frame, [MOVE_START, MOVE_END], [0, 1], { ...clamp, easing: ease });
  const x = from.x + (to.x - from.x) * m;
  const y = from.y + (to.y - from.y) * m;
  const press = interpolate(frame, [CLICK - 2, CLICK, CLICK + 5], [0, 1, 0], clamp);
  const zoom = interpolate(frame, [MOVE_START + 6, CLICK + 4], [1, 1.1], { ...clamp, easing: ease });
  const ox = (box.x + box.w / 2) * S;
  const oy = (box.y + box.h / 2) * S;
  const hl = interpolate(frame, [CLICK - 4, CLICK, CLICK + 30], [0, 1, 0.0], clamp);
  return (
    <AbsoluteFill style={{ opacity: fadeIn(frame) }}>
      <Window url={urlOf(shot)}>
        <div style={{ position: "absolute", inset: 0, scale: zoom, transformOrigin: `${ox}px ${oy}px` }}>
          <Img src={staticFile(`demo/${s.file}`)} style={{ width: VW, display: "block" }} />
          <div
            style={{
              position: "absolute",
              left: box.x * S - 6,
              top: box.y * S - 6,
              width: box.w * S + 12,
              height: box.h * S + 12,
              outline: `4px solid ${c.brandOnDark}`,
              opacity: hl,
            }}
          />
        </div>
      </Window>
      <Ripple x={to.x} y={to.y} t={(frame - CLICK) / 18} />
      <Cursor x={x} y={y} press={press} opacity={fresh ? fadeIn(frame) : 1} />
    </AbsoluteFill>
  );
};

const StillStep: React.FC<{ shot: string }> = ({ shot }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = cap(shot);
  return (
    <AbsoluteFill style={{ opacity: fadeIn(frame) }}>
      <Window url={urlOf(shot)}>
        <Img
          src={staticFile(`demo/${s.file}`)}
          style={{ width: VW, display: "block", scale: interpolate(frame, [0, durationInFrames], [1, 1.05]), transformOrigin: "50% 35%" }}
        />
      </Window>
    </AbsoluteFill>
  );
};

const ScrollStep: React.FC<{ shot: string; stop: number }> = ({ shot, stop }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const s = cap(shot);
  const max = s.height * S - VH;
  const p = interpolate(frame, [16, durationInFrames - 16], [0, 1], { ...clamp, easing: (t) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2) });
  return (
    <AbsoluteFill style={{ opacity: fadeIn(frame) }}>
      <Window url={urlOf(shot)}>
        <Img src={staticFile(`demo/${s.file}`)} style={{ width: VW, display: "block", translate: `0 ${-max * stop * p}px` }} />
        {/* barra de rolagem */}
        <div style={{ position: "absolute", right: 4, top: 4 + (VH - 8 - (VH * VH) / (s.height * S)) * stop * p, width: 8, height: (VH * VH) / (s.height * S), borderRadius: 4, background: "rgba(0,0,0,0.35)" }} />
      </Window>
    </AbsoluteFill>
  );
};

const MobileStep: React.FC = () => {
  const frame = useCurrentFrame();
  const m02 = cap("m02-barbeiro");
  // m0x: 780×1688 (390 CSS × 2). No vídeo, cada celular tem 340px de tela.
  const PW = 340;
  const k = PW / 780;
  const tap = m02.box ? { x: (m02.box.x + m02.box.w / 2) * k, y: (m02.box.y + m02.box.h / 2) * k } : null;
  const shots = ["m01-vitrine", "m02-barbeiro", "m03-dia"];
  return (
    <AbsoluteFill style={{ opacity: fadeIn(frame), background: c.ink }}>
      <div
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: 60,
          display: "flex",
          justifyContent: "center",
          gap: 70,
        }}
      >
        {shots.map((id, i) => {
          const p = prog(frame, 6 + i * 8, 26);
          return (
            <div key={id} style={{ position: "relative", opacity: p, translate: `0 ${(1 - p) * 160}px` }}>
              <Phone src={`demo/${cap(id).file}`} scale={PW / 390} style={{}} />
              {i === 1 && tap && (
                <div style={{ position: "absolute", left: 16 + tap.x, top: 16 + tap.y }}>
                  <Ripple x={0} y={0} t={(frame - 60) / 18} />
                  <div
                    style={{
                      position: "absolute",
                      left: -22,
                      top: -22,
                      width: 44,
                      height: 44,
                      borderRadius: 22,
                      background: "rgba(255,255,255,0.75)",
                      boxShadow: "0 0 0 3px rgba(17,17,17,0.35)",
                      opacity: interpolate(frame, [44, 52, 64, 74], [0, 1, 1, 0], clamp),
                      scale: interpolate(frame, [56, 60, 66], [1, 0.8, 1], clamp),
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const ChapterCard: React.FC<{ n: string; title: string; sub: string }> = ({ n, title, sub }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: c.brand, opacity: fadeIn(frame), justifyContent: "center", paddingLeft: 200 }}>
      <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 64, color: "rgba(255,255,255,0.55)", ...rise(frame, 2, 30, 14) }}>{n}</div>
      <div style={{ fontFamily: heading, fontSize: 140, lineHeight: 1.1, color: "#fff", ...rise(frame, 6, 40, 16) }}>{title}</div>
      <div style={{ fontFamily: body, fontSize: 44, color: "#fde4e7", marginTop: 20, ...rise(frame, 12, 30, 16) }}>{sub}</div>
    </AbsoluteFill>
  );
};

const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
      <div style={{ width: 200, height: 200, borderRadius: 100, background: c.paper, display: "flex", alignItems: "center", justifyContent: "center", ...rise(frame, 0, 30, 20) }}>
        <Img2 src="logo.png" style={{ width: 168, height: 168 }} />
      </div>
      <div style={{ marginTop: 40 }}>
        <Ornament p={prog(frame, 8, 20)} />
      </div>
      <div style={{ fontFamily: heading, fontSize: 130, color: c.paper, lineHeight: 1.1, marginTop: 16, ...rise(frame, 10, 40, 20) }}>Augusto Barbearia</div>
      <div style={{ fontFamily: body, fontWeight: 600, fontSize: 40, color: c.brandOnDark, marginTop: 22, ...rise(frame, 20, 30, 18) }}>
        Demonstração do sistema
      </div>
      <div style={{ fontFamily: body, fontSize: 32, color: c.onInkMuted, marginTop: 14, ...rise(frame, 26, 30, 18) }}>
        Uma barbearia real, três barbeiros e dados fictícios
      </div>
    </AbsoluteFill>
  );
};

const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const items = ["Agendamento online", "Agenda", "Pagamentos", "Relatórios", "E-mails e lembretes"];
  return (
    <AbsoluteFill style={{ background: c.ink, alignItems: "center", justifyContent: "center", flexDirection: "column", opacity: fadeIn(frame) }}>
      <div style={{ width: 170, height: 170, borderRadius: 85, background: c.paper, display: "flex", alignItems: "center", justifyContent: "center", ...rise(frame, 4, 30, 18) }}>
        <Img2 src="logo.png" style={{ width: 142, height: 142 }} />
      </div>
      <div style={{ fontFamily: heading, fontSize: 120, color: c.paper, lineHeight: 1.1, marginTop: 30, ...rise(frame, 10, 40, 20) }}>Augusto Barbearia</div>
      <div style={{ display: "flex", gap: 14, marginTop: 36 }}>
        {items.map((t, i) => (
          <div key={t} style={{ border: `2px solid ${c.lineOnInk}`, color: c.paper, fontFamily: body, fontWeight: 500, fontSize: 28, padding: "10px 22px", ...rise(frame, 22 + i * 5, 20, 12) }}>
            {t}
          </div>
        ))}
      </div>
      <div
        style={{
          marginTop: 56,
          background: c.brand,
          color: "#fff",
          fontFamily: button,
          fontWeight: 900,
          fontSize: 34,
          letterSpacing: "0.02em",
          textTransform: "uppercase",
          padding: "20px 40px",
          ...rise(frame, 50, 20, 14),
        }}
      >
        Agendar horário
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [durationInFrames - 24, durationInFrames], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- montagem
const Sfx: React.FC<{ at: number; name: string; volume: number }> = ({ at, name, volume }) => (
  <Sequence from={at} durationInFrames={60} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
  </Sequence>
);

const captionOf = (it: Item): { chapter: string; text: string } | null => {
  if (it.kind === "click" || it.kind === "still" || it.kind === "scroll") return { chapter: it.chapter, text: it.caption };
  if (it.kind === "mobile") return { chapter: "Celular", text: "No celular é o mesmo sistema, sem instalar nada" };
  return null;
};

export const Demo: React.FC = () => {
  let lastPos = REST;
  let prevClick = false;
  const nodes: React.ReactNode[] = [];
  const sfx: React.ReactNode[] = [];
  TIMED.forEach((it, i) => {
    let content: React.ReactNode = null;
    if (it.kind === "click") {
      content = <ClickStep shot={it.shot} from={lastPos} fresh={!prevClick} />;
      lastPos = center(cap(it.shot).box!);
      sfx.push(<Sfx key={`c${i}`} at={it.from + CLICK} name="click" volume={0.5} />);
    } else if (it.kind === "still") {
      content = <StillStep shot={it.shot} />;
      if (it.ding) sfx.push(<Sfx key={`d${i}`} at={it.from + 6} name="ding" volume={0.3} />);
    } else if (it.kind === "scroll") content = <ScrollStep shot={it.shot} stop={it.stop ?? 1} />;
    else if (it.kind === "mobile") {
      content = <MobileStep />;
      sfx.push(<Sfx key={`t${i}`} at={it.from + 58} name="pop" volume={0.35} />);
    } else if (it.kind === "chapter") {
      content = <ChapterCard n={it.n} title={it.title} sub={it.sub} />;
      sfx.push(<Sfx key={`w${i}`} at={it.from - 4} name="whoosh" volume={0.45} />);
    } else if (it.kind === "intro") content = <Intro />;
    else content = <Outro />;
    if (it.kind !== "click") {
      prevClick = false;
      if (it.kind !== "still" && it.kind !== "scroll") lastPos = REST;
    } else prevClick = true;
    const capn = captionOf(it);
    nodes.push(
      <Sequence key={i} from={it.from} durationInFrames={it.dur} name={`${String(i).padStart(2, "0")} ${"shot" in it ? it.shot : it.kind}`}>
        {content}
        {capn && <Caption chapter={capn.chapter} text={capn.text} />}
      </Sequence>,
    );
  });
  return (
    <AbsoluteFill style={{ background: c.ink }}>
      {nodes}
      <Audio src={staticFile("audio/trilha-demo.wav")} volume={0.9} />
      {sfx}
    </AbsoluteFill>
  );
};
