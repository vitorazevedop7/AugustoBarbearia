"use client";

import Image from "next/image";
import { useState } from "react";

const ratios = {
  "4/5": "aspect-[4/5]",
  "6/7": "aspect-[6/7]",
} as const;

/**
 * Foto do barbeiro numa moldura de proporção fixa: 4:5 (padrão) ou 6:7 (card
 * da vitrine, como o Beard X). Sem foto, um quadro neutro com a inicial do
 * nome, para a tela funcionar enquanto as fotos reais não chegam (P10). A
 * inicial acompanha a largura da moldura, da miniatura da administração ao
 * card da vitrine. Com `zoom`, a foto cresce 10% quando o card (`group`)
 * recebe o ponteiro, sem sair da moldura. Se o arquivo não carrega (um
 * caminho digitado errado no cadastro, #159), a moldura também cai na inicial.
 */
export function BarberPhoto({
  name,
  photoPath,
  sizes,
  ratio = "4/5",
  zoom = false,
  decorative = false,
  className = "",
}: {
  name: string;
  photoPath: string | null;
  sizes: string;
  ratio?: keyof typeof ratios;
  zoom?: boolean;
  /** A foto só enfeita um link que já tem o nome (ex.: o card do agendamento). */
  decorative?: boolean;
  className?: string;
}) {
  // O caminho que falhou: outro caminho tenta carregar de novo.
  const [failedPath, setFailedPath] = useState<string | null>(null);
  const showPhoto = photoPath !== null && photoPath !== failedPath;
  const zoomClasses = zoom
    ? "transition-transform duration-300 ease-standard group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    : "";
  return (
    <div
      className={`@container relative ${ratios[ratio]} overflow-hidden bg-line outline-1 -outline-offset-1 outline-ink/10 ${className}`}
    >
      {showPhoto ? (
        <Image
          src={photoPath}
          alt={decorative ? "" : `Foto de ${name}`}
          fill
          sizes={sizes}
          className={`object-cover ${zoomClasses}`}
          onError={() => setFailedPath(photoPath)}
          // O erro pode acontecer antes da hidratação, sem chamar o `onError`:
          // uma imagem já concluída e sem largura não carregou.
          ref={(image) => {
            if (image?.complete && image.naturalWidth === 0) {
              setFailedPath(photoPath);
            }
          }}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-heading text-[38cqw] leading-none font-normal text-ink-muted"
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
