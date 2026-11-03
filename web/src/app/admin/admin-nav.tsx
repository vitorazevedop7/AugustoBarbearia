"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/** Só entram itens que já têm tela. */
const items = [
  { href: "/admin", label: "Início" },
  { href: "/admin/agenda", label: "Agenda" },
  { href: "/admin/clientes", label: "Clientes" },
  { href: "/admin/relatorio", label: "Relatório" },
  { href: "/admin/cadastros", label: "Cadastros" },
];

function isCurrent(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === href
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Administração" className="border-b border-line bg-surface">
      {/* No celular as abas não cabem: elas rolam na horizontal, e a borda
          direita esmaece para indicar que há mais (#156). O espaço extra no
          fim deixa a última aba sair do esmaecimento. */}
      <ul className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pr-12 pl-4 [mask-image:linear-gradient(to_right,black_calc(100%-3rem),transparent)] sm:px-6 sm:[mask-image:none] lg:px-8">
        {items.map(({ href, label }) => {
          const current = isCurrent(pathname, href);
          return (
            <li key={href} className="shrink-0">
              <Link
                href={href}
                aria-current={current ? "page" : undefined}
                className={`flex min-h-12 items-center border-b-2 px-3 text-sm font-semibold transition-colors duration-300 ease-standard focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none ${
                  current
                    ? "border-brand text-ink"
                    : "border-transparent text-ink-muted hover:text-ink"
                }`}
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
