import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Augusto Barbearia";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// ImageResponse não lê variáveis CSS: estes são os tokens ink e surface
// da identidade visual, usados também pelo hero e pelo cabeçalho.
const colors = { ink: "#111111", surface: "#ffffff" };

export default async function OpenGraphImage() {
  // Assets locais: sem chamadas externas na geração nem no runtime Docker.
  // prepare-standalone.mjs já inclui todo o diretório public na imagem final.
  const [background, logo, barlow] = await Promise.all([
    readFile(join(process.cwd(), "public/images/vitrine/og-background.jpg")),
    readFile(join(process.cwd(), "public/logo.png")),
    readFile(join(process.cwd(), "public/fonts/Barlow-Black.ttf")),
  ]);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: colors.ink,
        color: colors.surface,
      }}
    >
      {/* ImageResponse usa img nativo para rasterizar a prévia. O fundo é o
          hero reduzido a 1200×630 com o escurecimento (ink a 80%) já aplicado
          no arquivo: assim o PNG fica leve (o WhatsApp descarta prévias acima
          de ~300 KB), o que não ocorre com a foto cheia sob um overlay. */}
      <img
        src={`data:image/jpeg;base64,${background.toString("base64")}`}
        alt=""
        width={1200}
        height={630}
        style={{ position: "absolute", top: 0, left: 0, objectFit: "cover" }}
      />
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 48,
          padding: 72,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 200,
            height: 200,
            flexShrink: 0,
            borderRadius: "50%",
            backgroundColor: colors.surface,
          }}
        >
          <img
            src={`data:image/png;base64,${logo.toString("base64")}`}
            alt=""
            width={160}
            height={160}
          />
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontFamily: "Barlow",
            fontWeight: 900,
            fontSize: 88,
            lineHeight: 1.05,
          }}
        >
          <span>AUGUSTO</span>
          <span>BARBEARIA</span>
        </div>
      </div>
    </div>,
    {
      ...size,
      fonts: [{ name: "Barlow", data: barlow, weight: 900, style: "normal" }],
    },
  );
}
