import Image from "next/image";

/**
 * Foto do barbeiro em 4:5. Sem foto, um quadro neutro com a inicial do nome,
 * para a tela funcionar enquanto as fotos reais não chegam (P10).
 */
export function BarberPhoto({
  name,
  photoPath,
  sizes,
  className = "",
}: {
  name: string;
  photoPath: string | null;
  sizes: string;
  className?: string;
}) {
  return (
    <div
      className={`relative aspect-[4/5] overflow-hidden bg-line ${className}`}
    >
      {photoPath ? (
        <Image
          src={photoPath}
          alt={`Foto de ${name}`}
          fill
          sizes={sizes}
          className="object-cover"
        />
      ) : (
        <span
          aria-hidden="true"
          className="flex size-full items-center justify-center font-heading text-3xl font-bold text-ink-muted"
        >
          {name.trim().charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  );
}
