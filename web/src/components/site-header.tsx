import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { AccountPlaceholder, HeaderAccount } from "@/components/header-account";
import { SiteNav } from "@/components/site-nav";
import { ButtonLink } from "@/components/ui/button";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { BOOKING_PATH } from "@/lib/booking";

/**
 * Cabeçalho fixo, com a navegação da vitrine e a chamada para agendar.
 * No desktop fica tudo numa linha; no celular, num menu. Só a conta depende
 * do usuário, e ela chega à parte, num `Suspense` com o mesmo tamanho.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Augusto Barbearia — página inicial"
          className="flex min-w-0 items-center gap-3 transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Image src="/logo.png" alt="" width={48} height={48} preload />
          <span className="font-heading text-lg leading-tight font-bold text-ink sm:text-xl">
            Augusto Barbearia
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <SiteNav layout="row" />
          <div className="flex items-center gap-3">
            {/* Largura fixa: cabe "Entrar com Google" ou o nome (até 120px) e
                "Sair", e a troca do fallback não move a navegação. */}
            <div className="flex w-52 justify-end">
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
          <div className="px-4 pt-2 pb-6 sm:px-6">
            <SiteNav layout="column" />
            <ButtonLink href={BOOKING_PATH} className="mt-6 w-full">
              Agendar horário
            </ButtonLink>
            <div className="mt-4">
              <Suspense fallback={<AccountPlaceholder />}>
                <HeaderAccount stacked />
              </Suspense>
            </div>
          </div>
        </MobileMenu>
      </div>
    </header>
  );
}
