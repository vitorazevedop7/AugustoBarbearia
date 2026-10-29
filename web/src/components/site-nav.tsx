"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Páginas da vitrine no cabeçalho. "Contato" é a seção do fim da página inicial. */
export const siteLinks = [
  { href: "/servicos", label: "Serviços" },
  { href: "/barbeiros", label: "Barbeiros" },
  { href: "/#contato", label: "Contato" },
];

const focus =
  "transition-colors duration-300 ease-out focus-visible:outline-2 focus-visible:outline-brand motion-reduce:transition-none";

const layouts = {
  row: {
    list: "flex items-center gap-6",
    link: `inline-flex min-h-11 items-center border-b-2 text-sm font-semibold text-ink hover:border-b-brand focus-visible:outline-offset-4 ${focus}`,
    current: "border-b-brand",
    idle: "border-b-transparent",
  },
  column: {
    list: "flex flex-col divide-y divide-line border-b border-line",
    link: `flex min-h-12 items-center border-l-4 pl-3 text-base font-semibold text-ink hover:text-brand focus-visible:-outline-offset-2 ${focus}`,
    current: "border-l-brand",
    idle: "border-l-transparent",
  },
};

/** Links da vitrine. A página atual ganha `aria-current` e um traço em `brand`. */
export function SiteNav({ layout }: { layout: "row" | "column" }) {
  const pathname = usePathname();
  const { list, link, current, idle } = layouts[layout];
  return (
    <nav aria-label="Principal">
      <ul className={list}>
        {siteLinks.map(({ href, label }) => {
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
