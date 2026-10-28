import { Ornament } from "./ornament";

/** Bloco de título de seção: ornamento, título e texto de apoio. */
export function SectionHeading({
  title,
  description,
  align = "center",
  tone = "light",
}: {
  title: string;
  description?: string;
  align?: "center" | "start";
  tone?: "light" | "dark";
}) {
  const centered = align === "center";
  return (
    <div className={`max-w-2xl ${centered ? "mx-auto text-center" : ""}`}>
      <Ornament align={align} tone={tone} />
      <h2
        className={`mt-6 font-heading text-display-2 font-bold ${tone === "dark" ? "text-surface" : "text-ink"}`}
      >
        {title}
      </h2>
      {description ? (
        <p
          className={`mt-4 text-base leading-relaxed sm:text-lg ${tone === "dark" ? "text-on-ink-muted" : "text-ink-muted"}`}
        >
          {description}
        </p>
      ) : null}
    </div>
  );
}
