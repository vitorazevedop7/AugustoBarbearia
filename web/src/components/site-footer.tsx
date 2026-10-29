import Image from "next/image";
import Link from "next/link";

const openingHours = [
  { days: "Segunda a sexta", hours: "10h às 19h" },
  { days: "Sábado", hours: "9h às 14h" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[2fr_1fr] lg:px-8 lg:py-20">
        <div className="flex items-center gap-4">
          {/* O logo tem traços pretos: no fundo escuro ele fica num círculo claro. */}
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface">
            <Image src="/logo.png" alt="" width={48} height={48} />
          </span>
          <p className="font-heading text-display-3 font-bold">
            Augusto Barbearia
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold tracking-[0.08em] text-on-ink-muted uppercase">
            Horário de funcionamento
          </h2>
          <dl className="mt-4 space-y-2">
            {openingHours.map(({ days, hours }) => (
              <div key={days} className="flex justify-between gap-6">
                <dt className="text-on-ink-muted">{days}</dt>
                <dd className="font-semibold">{hours}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
      <div className="border-t border-line-on-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-sm text-on-ink-muted sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} Augusto Barbearia</p>
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center underline underline-offset-4 transition-colors duration-300 ease-out hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface motion-reduce:transition-none"
          >
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
