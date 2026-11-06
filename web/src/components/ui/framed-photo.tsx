import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import type { VitrinePhoto } from "@/lib/vitrine-photos";

/** A proporção reserva o espaço; a foto fica parada (sem zoom no hover). */
export function FramedPhoto({
  photo,
  sizes,
  ratioClassName = "aspect-[3/2]",
  className = "",
  ...props
}: {
  photo: VitrinePhoto;
  sizes: string;
  ratioClassName?: string;
} & Omit<ComponentPropsWithoutRef<"div">, "children">) {
  return (
    <div
      {...props}
      className={`relative ${ratioClassName} overflow-hidden bg-line outline-1 -outline-offset-1 outline-ink/10 ${className}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        className="object-cover"
      />
    </div>
  );
}
