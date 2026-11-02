import Image from "next/image";
import type { ComponentPropsWithoutRef } from "react";
import type { VitrinePhoto } from "@/lib/vitrine-photos";

/** A proporção reserva o espaço; o zoom fica recortado dentro da moldura. */
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
      className={`group relative ${ratioClassName} overflow-hidden bg-line ${className}`}
    >
      <Image
        src={photo.src}
        alt={photo.alt}
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-300 ease-standard group-hover:scale-110 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
      />
    </div>
  );
}
