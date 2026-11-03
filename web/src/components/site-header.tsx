import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountPlaceholder, HeaderAccount } from "@/components/header-account";
import { HeaderFrame } from "@/components/header-frame";
import { SiteNav } from "@/components/site-nav";
import { ButtonLink } from "@/components/ui/button";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { BOOKING_PATH } from "@/lib/booking";

/**
 * Cabeçalho escuro, com a navegação da vitrine e a chamada para agendar.
 * Na página inicial, ele fica transparente sobre o hero (`HeaderFrame`), e
 * em nenhuma página é fixo: rola com ela. No desktop fica tudo numa linha;
 * no celular, num menu. Só a conta depende do usuário, e ela chega à parte,
 * num `Suspense` cujo fallback é o link "Entrar", do mesmo tamanho, para o
 * login funcionar sem JavaScript.
 */
export function SiteHeader() {
  return (
    <HeaderFrame>
      <div className="mx-auto flex h-20 max-w-site items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Augusto Barbearia — página inicial"
          className="flex min-w-0 items-center gap-3 transition-transform duration-300 ease-standard hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-surface motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          {/* O logo tem traços pretos: no escuro, ele fica num círculo claro
              até chegar a versão negativa (P1). */}
          <span className="grid size-14 shrink-0 place-items-center rounded-full bg-surface">
            <Image src="/logo.png" alt="" width={44} height={44} preload />
          </span>
          <span className="font-heading text-lg leading-tight font-black text-surface uppercase sm:text-xl">
            Augusto Barbearia
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <SiteNav layout="row" />
          <div className="flex items-center gap-3">
            {/* Largura mínima: cabe "Entrar com Google", e a troca do
                fallback não move a navegação do visitante. Logado, a conta
                cresce com os links da área dele. */}
            <div className="flex min-w-52 justify-end">
              <Suspense fallback={<AccountPlaceholder />}>
                <HeaderAccount />
              </Suspense>
            </div>
            <ButtonLink href={BOOKING_PATH} size="sm">
              Agendar
            </ButtonLink>
          </div>
        </div>

        <MobileMenu>
          <div className="px-4 pt-2 pb-8 sm:px-6">
            <SiteNav layout="column" />
            <ButtonLink href={BOOKING_PATH} className="mt-8 w-full">
              Agendar horário
            </ButtonLink>
            <div className="mt-4">
              <Suspense fallback={<AccountPlaceholder stacked />}>
                <HeaderAccount stacked />
              </Suspense>
            </div>
          </div>
        </MobileMenu>
      </div>
    </HeaderFrame>
  );
}
