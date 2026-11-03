"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Páginas da vitrine no cabeçalho. "Contato" é a seção do fim da página inicial. */
export const siteLinks: SiteLink[] = [
  { href: "/servicos", label: "Serviços" },
  { href: "/barbeiros", label: "Barbeiros" },
  { href: "/#contato", label: "Contato" },
];

const focus =
  "transition-colors duration-300 ease-standard focus-visible:outline-2 focus-visible:outline-surface motion-reduce:transition-none";

const layouts = {
  row: {
    list: "flex items-center gap-6",
    // Sem quebra: em 1024px, a vitrine e "Meus agendamentos" ainda cabem na linha.
    link: `inline-flex min-h-11 items-center border-b-2 text-sm font-semibold whitespace-nowrap text-surface hover:border-b-brand focus-visible:outline-offset-4 ${focus}`,
    current: "border-b-brand",
    idle: "border-b-transparent",
  },
  column: {
    list: "flex flex-col divide-y divide-line-on-ink border-b border-line-on-ink",
    link: `flex min-h-12 items-center border-l-4 pl-3 text-base font-semibold text-surface hover:text-brand-on-dark focus-visible:-outline-offset-2 ${focus}`,
    current: "border-l-brand",
    idle: "border-l-transparent",
  },
};

export type SiteLink = { href: string; label: string };

/**
 * Links sobre o cabeçalho escuro: a vitrine ("Principal") ou, com `links`, as
 * áreas da conta. A página atual ganha `aria-current` e um traço em `brand`.
 */
export function SiteNav({
  layout,
  links = siteLinks,
  label = "Principal",
}: {
  layout: "row" | "column";
  links?: SiteLink[];
  label?: string;
}) {
  const pathname = usePathname();
  const { list, link, current, idle } = layouts[layout];
  return (
    <nav aria-label={label}>
      <ul className={list}>
        {links.map(({ href, label }) => {
          const isCurrent = href === pathname;
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={isCurrent ? "page" : undefined}
                className={`${link} ${isCurrent ? current : idle}`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
