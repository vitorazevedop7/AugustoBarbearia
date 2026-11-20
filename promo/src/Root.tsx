import { Composition } from "remotion";
import { Promo } from "./Promo";
import { Demo } from "./demo/Demo";
import { TOTAL } from "./demo/timeline";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Comercial"
        component={Promo}
        durationInFrames={1620}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="Demonstracao"
        component={Demo}
        durationInFrames={TOTAL}
        fps={30}
        width={1920}
        height={1080}
      />
    </>
  );
};
