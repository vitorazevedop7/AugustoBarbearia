import { Ornament } from "@/components/ui/ornament";

/** Faixa escura do topo das páginas internas da vitrine, com o único `h1`. */
export function PageHero({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="bg-ink px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
      <div className="mx-auto max-w-site">
        <div className="motion-safe:animate-rise">
          <Ornament align="start" tone="dark" />
        </div>
        <h1 className="mt-6 font-heading text-display-1 font-black uppercase text-surface motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-body text-on-ink-muted motion-safe:animate-rise motion-safe:[animation-delay:160ms]">
          {description}
        </p>
      </div>
    </section>
  );
}
