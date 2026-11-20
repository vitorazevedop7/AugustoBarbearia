import { Audio } from "@remotion/media";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import {
  AgendaReport,
  Booking,
  Brand,
  Dashboard,
  FEATURE_FRAMES,
  Features,
  Finale,
  Hook,
  KPI_FRAMES,
  MOBILE_FRAMES,
  Mobile,
  MyAppointments,
  STEP_FRAMES,
  Turn,
} from "./scenes";

// 120 BPM a 30 fps: uma batida a cada 15 quadros, um compasso a cada 60.
const Sfx: React.FC<{ at: number; name: string; volume?: number }> = ({ at, name, volume = 0.5 }) => (
  <Sequence from={at} durationInFrames={60} layout="none" name={`sfx ${name}`}>
    <Audio src={staticFile(`audio/${name}.wav`)} volume={volume} />
  </Sequence>
);

export const Promo: React.FC = () => {
  return (
    <AbsoluteFill style={{ background: "#111" }}>
      <Sequence name="Gancho" durationInFrames={120}>
        <Hook />
      </Sequence>
      <Sequence name="Marca" from={120} durationInFrames={120}>
        <Brand />
      </Sequence>
      <Sequence name="Agendamento" from={240} durationInFrames={300}>
        <Booking />
      </Sequence>
      <Sequence name="Celular" from={540} durationInFrames={180}>
        <Mobile />
      </Sequence>
      <Sequence name="Meus agendamentos" from={720} durationInFrames={120}>
        <MyAppointments />
      </Sequence>
      <Sequence name="Virada" from={840} durationInFrames={60}>
        <Turn />
      </Sequence>
      <Sequence name="Painel" from={900} durationInFrames={240}>
        <Dashboard />
      </Sequence>
      <Sequence name="Agenda e relatório" from={1140} durationInFrames={180}>
        <AgendaReport />
      </Sequence>
      <Sequence name="Recursos" from={1320} durationInFrames={120}>
        <Features />
      </Sequence>
      <Sequence name="Final" from={1440} durationInFrames={180}>
        <Finale />
      </Sequence>

      <Audio src={staticFile("audio/trilha.wav")} volume={0.85} />

      {[0, 30, 60].map((f) => (
        <Sfx key={`h${f}`} at={f + 12} name="click" volume={0.35} />
      ))}
      {[118, 236, 536, 716, 1136, 1316].map((f) => (
        <Sfx key={`w${f}`} at={f - 6} name="whoosh" volume={0.45} />
      ))}
      {STEP_FRAMES.map((f) => (
        <Sfx key={`s${f}`} at={240 + f} name="click" volume={0.4} />
      ))}
      <Sfx at={240 + 204} name="ding" volume={0.35} />
      {MOBILE_FRAMES.map((f) => (
        <Sfx key={`m${f}`} at={540 + f} name="pop" volume={0.35} />
      ))}
      {KPI_FRAMES.map((f) => (
        <Sfx key={`k${f}`} at={900 + f} name="pop" volume={0.3} />
      ))}
      <Sfx at={1140 + 110} name="click" volume={0.45} />
      {FEATURE_FRAMES.map((f) => (
        <Sfx key={`f${f}`} at={1320 + f} name="pop" volume={0.3} />
      ))}
      <Sfx at={1440 + 48} name="ding" volume={0.25} />
    </AbsoluteFill>
  );
};
