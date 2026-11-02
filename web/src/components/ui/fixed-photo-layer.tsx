import Image from "next/image";
import type { VitrinePhoto } from "@/lib/vitrine-photos";

/**
 * A seção deve recortar a camada fixa com `[clip-path:inset(0)]`.
 * Com menos movimento, a foto rola junto, como no celular.
 */
export function FixedPhotoLayer({
  photo,
  preload = false,
  imageClassName = "",
}: {
  photo: VitrinePhoto;
  /** Exclusivo do hero inicial, que é o LCP. */
  preload?: boolean;
  imageClassName?: string;
}) {
  return (
    <>
      <div className="absolute inset-0 motion-safe:lg:fixed">
        <Image
          src={photo.src}
          alt=""
          fill
          sizes="100vw"
          preload={preload}
          fetchPriority={preload ? "high" : undefined}
          className={`object-cover ${imageClassName}`}
        />
      </div>
      <div aria-hidden="true" className="absolute inset-0 bg-ink/70" />
    </>
  );
}
