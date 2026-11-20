import type React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import {
  Browser,
  Check,
  Img2,
  Ornament,
  Phone,
  body,
  button,
  c,
  clamp,
  ease,
  exitFade,
  heading,
  prog,
  rise,
} from "./ui";

const Eyebrow: React.FC<{ children: React.ReactNode; color?: string; style?: React.CSSProperties }> = ({
  children,
  color = c.brand,
  style,
}) => (
  <div style={{ fontFamily: body, fontWeight: 600, fontSize: 30, color, marginBottom: 22, ...style }}>{children}</div>
);

// ---------------------------------------------------------------- 1. Gancho
const PAINS = ["Telefone tocando.", "Agenda no papel.", "Cliente esperando."];

export const Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const idx = Math.min(3, Math.floor(frame / 30));
  const local = frame - idx * 30;
  const p = prog(local, 0, 10);
  return (
    <AbsoluteFill style={{ background: c.ink, opacity: exitFade(frame, durationInFrames, 6) }}>
      <Img2
        src="hero.jpg"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.28,
          filter: "grayscale(0.6) blur(2px)",
          scale: interpolate(frame, [0, durationInFrames], [1.18, 1.04]),
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 50%, rgba(17,17,17,0.2), #111 75%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        {idx < 3 ? (
          <div style={{ position: "relative", opacity: p, scale: interpolate(p, [0, 1], [1.08, 1]) }}>
            <div style={{ fontFamily: heading, fontSize: 140, color: c.paper, lineHeight: 1.1 }}>{PAINS[idx]}</div>
            <div
              style={{
                position: "absolute",
                left: -20,
                top: "54%",
                height: 10,
                width: `calc(${prog(local, 12, 10) * 100}% + 40px)`,
                background: c.brandOnDark,
              }}
            />
          </div>
        ) : (
          <div style={{ textAlign: "center", ...rise(local, 0, 30, 14) }}>
            <div style={{ fontFamily: heading, fontSize: 150, color: c.paper, lineHeight: 1.1 }}>
              Tem um jeito melhor.
            </div>
          </div>
        )}
      </AbsoluteFill>
      {/* contador de batidas: barras finas no rodapé */}
      <div style={{ position: "absolute", bottom: 90, left: 0, right: 0, display: "flex", justifyContent: "center", gap: 14 }}>
        {[0, 1, 2, 3].map((i) => (
          <div key={i} style={{ width: 70, height: 4, background: i <= idx ? c.brandOnDark : c.lineOnInk }} />
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 2. Marca
export const Brand: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 120 } });
  return (
    <AbsoluteFill style={{ background: c.ink, opacity: exitFade(frame, durationInFrames, 8) }}>
      <Img2
        src="mosaico-destaque.jpg"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          opacity: 0.22,
          scale: interpolate(frame, [0, durationInFrames], [1.05, 1.15]),
        }}
      />
      <AbsoluteFill style={{ background: "radial-gradient(circle at 50% 45%, rgba(17,17,17,0.35), #111 70%)" }} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
        <div
          style={{
            width: 250,
            height: 250,
            borderRadius: 125,
            background: c.paper,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            scale: interpolate(pop, [0, 1], [0.4, 1]),
            opacity: Math.min(1, pop * 2),
            boxShadow: `0 0 0 ${interpolate(frame, [0, 30], [0, 18], clamp)}px rgba(230,57,70,${interpolate(frame, [0, 30], [0.5, 0], clamp)})`,
          }}
        >
          <Img2 src="logo.png" style={{ width: 210, height: 210 }} />
        </div>
        <div style={{ marginTop: 44 }}>
          <Ornament p={prog(frame, 8, 20)} />
        </div>
        <div style={{ fontFamily: heading, fontSize: 150, color: c.paper, lineHeight: 1.1, marginTop: 20, ...rise(frame, 12, 40, 20) }}>
          Augusto Barbearia
        </div>
        <div style={{ fontFamily: body, fontSize: 42, color: c.onInkMuted, marginTop: 18, ...rise(frame, 24, 30, 20) }}>
          Agendamento online e gestão, num só lugar.
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 3. Agendamento do cliente
const STEPS = ["Barbeiro", "Serviço", "Dia", "Horário", "Confirmar"];
export const STEP_FRAMES = [36, 78, 120, 162, 204];

export const Booking: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const active = STEP_FRAMES.filter((f) => frame >= f).length - 1;
  // telas: vitrine → horário → confirmado
  const screens: [string, number][] = [
    ["vitrine.webp", 0],
    ["agendar-horario.webp", 110],
    ["confirmado.webp", 196],
  ];
  const enter = prog(frame, 6, 24);
  return (
    <AbsoluteFill style={{ background: c.paper, opacity: exitFade(frame, durationInFrames, 8) }}>
      <div style={{ position: "absolute", left: 120, top: 190, width: 620 }}>
        <Eyebrow style={rise(frame, 0)}>Para o cliente</Eyebrow>
        <div style={{ fontFamily: heading, fontSize: 92, lineHeight: 1.1, color: c.ink, ...rise(frame, 4) }}>
          Agende em<br />5 passos.
        </div>
        <div style={{ fontFamily: heading, fontSize: 92, lineHeight: 1.1, color: c.brand, ...rise(frame, 10) }}>
          Sem ligar.
        </div>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 16 }}>
          {STEPS.map((s, i) => {
            const on = i <= active;
            const cur = i === active;
            const pulse = cur ? interpolate(frame - STEP_FRAMES[i], [0, 8], [1.12, 1], { ...clamp, easing: ease }) : 1;
            return (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 22, ...rise(frame, 14 + i * 4, 20) }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    background: on ? c.brand : "transparent",
                    border: `3px solid ${on ? c.brand : c.line}`,
                    color: on ? "#fff" : c.inkMuted,
                    fontFamily: heading,
                    fontWeight: 700,
                    fontSize: 28,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    scale: pulse,
                  }}
                >
                  {i + 1}
                </div>
                <div
                  style={{
                    fontFamily: body,
                    fontWeight: cur ? 600 : 500,
                    fontSize: 38,
                    color: on ? c.ink : c.inkMuted,
                  }}
                >
                  {s}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 100,
          top: 200,
          opacity: enter,
          translate: `${(1 - enter) * 120}px 0`,
          rotate: `${(1 - enter) * 4}deg`,
        }}
      >
        <Browser width={1040}>
          {screens.map(([src, at], i) => {
            const next = screens[i + 1]?.[1] ?? Infinity;
            const pIn = i === 0 ? 1 : prog(frame, at, 16);
            if (frame < at || frame > next + 16) return null;
            return (
              <div
                key={src}
                style={{
                  position: "absolute",
                  inset: 0,
                  opacity: pIn,
                  translate: `${(1 - pIn) * 80}px 0`,
                }}
              >
                <Img2
                  src={src}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    scale: interpolate(frame - at, [0, 120], [1, 1.06], clamp),
                    transformOrigin: "50% 30%",
                  }}
                />
              </div>
            );
          })}
        </Browser>
        {/* selo de confirmação */}
        <div
          style={{
            position: "absolute",
            right: -30,
            bottom: -40,
            background: c.success,
            color: "#fff",
            fontFamily: body,
            fontWeight: 600,
            fontSize: 34,
            padding: "22px 34px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            boxShadow: "0 20px 40px rgba(0,0,0,0.25)",
            scale: interpolate(frame, [204, 214], [0.6, 1], { ...clamp, easing: ease }),
            opacity: prog(frame, 204, 8),
          }}
        >
          <Check color="rgba(255,255,255,0.18)" size={38} /> Horário confirmado
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 4. Celular
const MOBILE = [
  "Login com Google só na hora de confirmar",
  "E-mail de confirmação e lembrete 24h antes",
  "Direto para o calendário do celular",
];
export const MOBILE_FRAMES = [50, 76, 102];

export const Mobile: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p1 = prog(frame, 4, 26);
  const p2 = prog(frame, 14, 26);
  return (
    <AbsoluteFill style={{ background: c.ink, opacity: exitFade(frame, durationInFrames, 8), overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          right: -60,
          top: 90,
          borderRadius: 450,
          background: "radial-gradient(circle, rgba(196,30,58,0.35), rgba(17,17,17,0) 70%)",
        }}
      />
      <div style={{ position: "absolute", left: 120, top: 250, width: 820 }}>
        <Eyebrow color={c.brandOnDark} style={rise(frame, 0)}>
          Pelo celular
        </Eyebrow>
        <div style={{ fontFamily: heading, fontSize: 100, lineHeight: 1.1, color: c.paper, ...rise(frame, 6) }}>
          Feito para caber no bolso.
        </div>
        <div style={{ marginTop: 56, display: "flex", flexDirection: "column", gap: 28 }}>
          {MOBILE.map((t, i) => (
            <div key={t} style={{ display: "flex", alignItems: "center", gap: 24, ...rise(frame, MOBILE_FRAMES[i], 24, 14) }}>
              <Check />
              <div style={{ fontFamily: body, fontSize: 38, color: c.paper }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
      <Phone
        src="mobile-vitrine.webp"
        scale={1.12}
        style={{
          position: "absolute",
          right: 470,
          top: 100,
          rotate: `${-6 + (1 - p1) * -6}deg`,
          translate: `0 ${(1 - p1) * 700 + interpolate(frame, [0, 180], [0, -20])}px`,
        }}
      />
      <Phone
        src="mobile-agendar.webp"
        scale={1.12}
        style={{
          position: "absolute",
          right: 120,
          top: 70,
          rotate: `${5 + (1 - p2) * 8}deg`,
          translate: `0 ${(1 - p2) * 800 + interpolate(frame, [0, 180], [0, -36])}px`,
        }}
      />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 5. Meus agendamentos
export const MyAppointments: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = prog(frame, 0, 22);
  return (
    <AbsoluteFill style={{ background: c.paper2, opacity: exitFade(frame, durationInFrames, 6) }}>
      <div
        style={{
          position: "absolute",
          left: 100,
          top: 230,
          opacity: enter,
          translate: `${(1 - enter) * -120}px 0`,
        }}
      >
        <Browser width={1060}>
          <Img2
            src="meus-agendamentos.webp"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              scale: interpolate(frame, [0, durationInFrames], [1.0, 1.12]),
              transformOrigin: "30% 60%",
            }}
          />
        </Browser>
      </div>
      <div style={{ position: "absolute", left: 1250, top: 300, width: 580 }}>
        <Eyebrow style={rise(frame, 6)}>Meus agendamentos</Eyebrow>
        <div style={{ fontFamily: heading, fontSize: 84, lineHeight: 1.12, color: c.ink, ...rise(frame, 10) }}>
          Imprevisto? Remarque ou cancele sozinho.
        </div>
        <div style={{ fontFamily: body, fontSize: 34, lineHeight: 1.45, color: c.inkMuted, marginTop: 30, ...rise(frame, 20) }}>
          Sem mensagem, sem ligação. A barbearia fica sabendo na hora.
        </div>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 6. Virada
const TURN = ["E", "para", "quem", "cuida", "da", "barbearia…"];
export const Turn: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: c.brand, alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "0 34px", width: 1500 }}>
        {TURN.map((w, i) => (
          <span key={w} style={{ fontFamily: heading, fontSize: 130, lineHeight: 1.15, color: "#fff", ...rise(frame, i * 5, 40, 12) }}>
            {w}
          </span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 7. Painel
const fmt = (n: number, d = 0) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });

const KPIS: { label: string; value: number; dec: number; prefix?: string; suffix?: string; delta: string }[] = [
  { label: "Faturamento do mês", value: 10370, dec: 2, prefix: "R$ ", delta: "↑ 16,0%" },
  { label: "Atendimentos", value: 348, dec: 0, delta: "↑ 8,1%" },
  { label: "Ticket médio", value: 29.8, dec: 2, prefix: "R$ ", delta: "↑ 1,7%" },
  { label: "Taxa de faltas", value: 4.4, dec: 1, suffix: "%", delta: "↓ 2,5 p.p." },
];
export const KPI_FRAMES = [40, 52, 64, 76];

export const Dashboard: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const enter = prog(frame, 4, 26);
  const scroll = interpolate(frame, [120, 225], [0, 1], { ...clamp, easing: ease });
  return (
    <AbsoluteFill style={{ background: c.paper, opacity: exitFade(frame, durationInFrames, 8) }}>
      <div style={{ position: "absolute", left: 110, top: 130, width: 740 }}>
        <Eyebrow style={rise(frame, 0)}>Para a administração</Eyebrow>
        <div style={{ fontFamily: heading, fontSize: 84, lineHeight: 1.1, color: c.ink, ...rise(frame, 6) }}>
          O mês inteiro num relance.
        </div>
        <div style={{ marginTop: 50, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {KPIS.map((k, i) => {
            const p = prog(frame, KPI_FRAMES[i], 40);
            return (
              <div
                key={k.label}
                style={{
                  background: c.surface,
                  borderTop: `5px solid ${i === 0 ? c.brand : c.ink}`,
                  padding: "22px 22px",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
                  ...rise(frame, KPI_FRAMES[i], 30, 14),
                }}
              >
                <div style={{ fontFamily: body, fontWeight: 500, fontSize: 24, color: c.inkMuted }}>{k.label}</div>
                <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 42, color: c.ink, marginTop: 8, whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                  {k.prefix}
                  {fmt(k.value * p, k.dec)}
                  {k.suffix}
                </div>
                <div style={{ fontFamily: body, fontWeight: 600, fontSize: 24, color: c.success, marginTop: 4 }}>{k.delta}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 70,
          top: 170,
          opacity: enter,
          translate: `0 ${(1 - enter) * 200}px`,
        }}
      >
        <Browser width={960}>
          <Img2
            src="painel.webp"
            style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: 1 - prog(frame, 110, 12) }}
          />
          <div style={{ position: "absolute", inset: 0, background: c.paper, opacity: prog(frame, 110, 12) }}>
            <Img2
              src="painel-completo.webp"
              style={{
                width: "100%",
                translate: `0 ${-scroll * 740}px`,
              }}
            />
          </div>
        </Browser>
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 8. Agenda e relatório
export const AgendaReport: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const a = prog(frame, 6, 28);
  const b = prog(frame, 22, 28);
  const drift = interpolate(frame, [0, durationInFrames], [0, -30]);
  const chips = ["Pix", "Crédito", "Débito", "Dinheiro"];
  return (
    <AbsoluteFill style={{ background: c.ink, opacity: exitFade(frame, durationInFrames, 8), overflow: "hidden" }}>
      <div style={{ position: "absolute", top: 90, left: 0, right: 0, textAlign: "center" }}>
        <div style={{ fontFamily: heading, fontSize: 88, color: c.paper, lineHeight: 1.1, ...rise(frame, 0) }}>
          Agenda, pagamento e relatório.
        </div>
        <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 30 }}>
          {chips.map((ch, i) => (
            <div
              key={ch}
              style={{
                border: `2px solid ${c.lineOnInk}`,
                color: c.paper,
                fontFamily: body,
                fontWeight: 600,
                fontSize: 30,
                padding: "10px 26px",
                background: i === 0 ? c.brand : "transparent",
                borderColor: i === 0 ? c.brand : c.lineOnInk,
                ...rise(frame, 12 + i * 4, 20, 12),
              }}
            >
              {ch}
            </div>
          ))}
        </div>
      </div>
      <div style={{ position: "absolute", inset: 0, perspective: 2200 }}>
        <div
          style={{
            position: "absolute",
            left: 110,
            top: 380,
            opacity: a,
            translate: `${(1 - a) * -300}px ${drift}px`,
            rotate: "y 14deg",
          }}
        >
          <Browser width={980} dark>
            <Img2 src="agenda-semana.webp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Browser>
        </div>
        <div
          style={{
            position: "absolute",
            right: 110,
            top: 430,
            opacity: b,
            translate: `${(1 - b) * 300}px ${-drift}px`,
            rotate: "y -14deg",
          }}
        >
          <Browser width={980} dark>
            <Img2 src="relatorio.webp" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
          </Browser>
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          right: 160,
          bottom: 70,
          background: c.success,
          color: "#fff",
          fontFamily: button,
          fontWeight: 900,
          fontSize: 34,
          letterSpacing: "0.02em",
          padding: "18px 30px",
          textTransform: "uppercase",
          boxShadow: "0 20px 40px rgba(0,0,0,0.4)",
          opacity: prog(frame, 110, 8),
          scale: interpolate(frame, [110, 120], [0.6, 1], { ...clamp, easing: ease }),
        }}
      >
        ⬇ Exportar CSV
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 9. Mais recursos
const FEATURES: [string, string][] = [
  ["Lembrete automático", "por e-mail, 24h antes"],
  ["Bloqueio de horário", "almoço, folga e imprevistos"],
  ["Sem horário duplicado", "nem com dois clientes ao mesmo tempo"],
  ["Horários de pico", "o mapa da semana da casa"],
  ["Cadastro de clientes", "inclusive quem agenda no balcão"],
  ["Nada para instalar", "abre no navegador do celular"],
];
export const FEATURE_FRAMES = [16, 24, 32, 40, 48, 56];

export const Features: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ background: c.paper, opacity: exitFade(frame, durationInFrames, 6) }}>
      <div style={{ position: "absolute", left: 120, top: 110, fontFamily: heading, fontSize: 96, color: c.ink, ...rise(frame, 0) }}>
        E tem mais.
      </div>
      <div
        style={{
          position: "absolute",
          left: 120,
          right: 120,
          top: 300,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 28,
        }}
      >
        {FEATURES.map(([t, s], i) => {
          const p = prog(frame, FEATURE_FRAMES[i], 14);
          return (
            <div
              key={t}
              style={{
                background: i === 2 ? c.brand : c.ink,
                padding: "44px 40px",
                height: 300,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                opacity: p,
                scale: interpolate(p, [0, 1], [0.85, 1]),
              }}
            >
              <div style={{ fontFamily: heading, fontWeight: 700, fontSize: 40, color: i === 2 ? "#fff" : c.brandOnDark }}>
                {String(i + 1).padStart(2, "0")}
              </div>
              <div>
                <div style={{ fontFamily: heading, fontSize: 48, lineHeight: 1.15, color: "#fff" }}>{t}</div>
                <div style={{ fontFamily: body, fontSize: 28, color: i === 2 ? "#fde4e7" : c.onInkMuted, marginTop: 10 }}>{s}</div>
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------- 10. Chamada final
const TEAM = [
  ["edvaldo.jpg", "Edvaldo"],
  ["lauro.jpg", "Lauro"],
  ["manoel.jpg", "Manoel"],
];
export const Finale: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const pulse = 1 + 0.035 * Math.max(0, Math.sin(((frame - 60) / fps) * Math.PI * 2)) * (frame > 60 ? 1 : 0);
  return (
    <AbsoluteFill style={{ background: c.ink }}>
      <Img2
        src="hero.jpg"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          scale: interpolate(frame, [0, durationInFrames], [1.12, 1]),
        }}
      />
      <AbsoluteFill style={{ background: "linear-gradient(to top right, rgba(17,17,17,0.95) 20%, rgba(17,17,17,0.55) 70%, rgba(17,17,17,0.3))" }} />
      <div style={{ position: "absolute", left: 120, bottom: 140 }}>
        <div style={{ display: "flex", gap: 22, marginBottom: 46 }}>
          {TEAM.map(([src, name], i) => (
            <div key={name} style={{ textAlign: "center", ...rise(frame, 8 + i * 6, 40, 18) }}>
              <div style={{ width: 150, height: 150, borderRadius: 75, overflow: "hidden", border: `4px solid ${c.paper}` }}>
                <Img2 src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              <div style={{ fontFamily: body, fontWeight: 600, fontSize: 26, color: c.paper, marginTop: 12 }}>{name}</div>
            </div>
          ))}
        </div>
        <div style={{ ...rise(frame, 24) }}>
          <Ornament p={prog(frame, 24, 20)} align="flex-start" />
        </div>
        <div style={{ fontFamily: heading, fontSize: 150, lineHeight: 1.08, color: c.paper, marginTop: 18, ...rise(frame, 28, 40, 22) }}>
          Augusto Barbearia
        </div>
        <div style={{ fontFamily: body, fontSize: 44, color: c.onInkMuted, marginTop: 14, ...rise(frame, 38) }}>
          Seu horário, a um toque.
        </div>
        <div
          style={{
            display: "inline-block",
            marginTop: 44,
            background: c.brand,
            color: "#fff",
            fontFamily: button,
            fontWeight: 900,
            fontSize: 40,
            letterSpacing: "0.02em",
            textTransform: "uppercase",
            padding: "26px 52px",
            scale: pulse,
            ...rise(frame, 48, 30, 16),
          }}
        >
          Agendar horário
        </div>
      </div>
      <AbsoluteFill style={{ background: "#000", opacity: interpolate(frame, [durationInFrames - 24, durationInFrames], [0, 1], clamp) }} />
    </AbsoluteFill>
  );
};
