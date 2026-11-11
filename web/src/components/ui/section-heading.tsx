import type { ReactNode } from "react";

/**
 * Bloco de título de seção. O título abre a seção sozinho, sem ornamento nem
 * rótulo acima dele. Com `aside` (o texto de apoio e uma ação), o bloco se
 * divide no desktop: o título à esquerda e o `aside` à direita, alinhados
 * pela base. `align="center"` fica para o que é simétrico.
 */
export function SectionHeading({
  id,
  title,
  description,
  align = "start",
  tone = "light",
  aside,
}: {
  /** `id` do `h2`, para a seção apontar para ele com `aria-labelledby`. */
  id?: string;
  title: string;
  description?: string;
  align?: "center" | "start";
  tone?: "light" | "dark";
  /** Ação ao lado do título (ex.: "Ver todos os serviços"). */
  aside?: ReactNode;
}) {
  const centered = align === "center";
  const muted = tone === "dark" ? "text-on-ink-muted" : "text-ink-muted";
  return (
    <div
      className={
        centered
          ? "mx-auto max-w-3xl text-center"
          : "grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-8"
      }
    >
      <h2
        id={id}
        className={`font-heading text-display-2 font-normal ${centered ? "" : "lg:col-span-7"} ${tone === "dark" ? "text-surface" : "text-ink"}`}
      >
        {title}
      </h2>
      {description || aside ? (
        <div
          className={
            centered
              ? "mt-5"
              : "flex flex-col items-start gap-5 lg:col-span-5 lg:items-end lg:text-right"
          }
        >
          {description ? (
            <p className={`max-w-md text-body ${muted}`}>{description}</p>
          ) : null}
          {aside}
        </div>
      ) : null}
    </div>
  );
}
