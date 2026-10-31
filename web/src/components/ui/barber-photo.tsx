import Image from "next/image";

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
 * recebe o ponteiro, sem sair da moldura.
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
  const zoomClasses = zoom
    ? "transition-transform duration-300 ease-standard group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    : "";
  return (
    <div
      className={`@container relative ${ratios[ratio]} overflow-hidden bg-line ${className}`}
    >
      {photoPath ? (
        <Image
          src={photoPath}
          alt={decorative ? "" : `Foto de ${name}`}
          fill
          sizes={sizes}
          className={`object-cover ${zoomClasses}`}
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-heading text-[38cqw] leading-none font-black text-ink-muted"
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
