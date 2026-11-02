import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { BOOKING_PATH } from "@/lib/booking";

export const metadata: Metadata = {
  title: "Página não encontrada — Augusto Barbearia",
  robots: { index: false },
};

/**
 * Endereço que não existe, ou um id inválido (`notFound()`), no visual do
 * site. O `main#main-content` é o alvo de "Pular para o conteúdo" (#151).
 */
export default function NotFound() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center px-4 py-16 sm:px-6 lg:py-24"
    >
      <div className="mx-auto w-full max-w-md bg-surface p-6 text-center shadow-card sm:p-10">
        <Ornament />
        <h1 className="mt-6 font-heading text-display-3 font-black uppercase text-ink">
          Página não encontrada
        </h1>
        <p className="mt-4 text-body text-ink-muted">
          O endereço pode ter mudado ou estar escrito errado. Volte para o
          início ou agende seu horário.
        </p>
        <div className="mt-8 flex flex-col gap-3">
          <ButtonLink href="/">Voltar para o início</ButtonLink>
          <ButtonLink href={BOOKING_PATH} variant="outline">
            Agendar horário
          </ButtonLink>
        </div>
      </div>
    </main>
  );
}
