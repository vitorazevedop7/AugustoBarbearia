import type { Metadata } from "next";
import { BarberList } from "@/components/vitrine/catalog";
import { PageHero } from "@/components/vitrine/page-hero";
import { getPublicBarbers } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Barbeiros — Augusto Barbearia",
  description:
    "Conheça os barbeiros da Augusto Barbearia e agende com quem você preferir.",
};

/** A equipe ativa (RN-60), cada barbeiro com a chamada para agendar com ele. */
export default async function BarbersPage() {
  const barbers = await getPublicBarbers();
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHero
        title="Barbeiros"
        description="Conheça a equipe e escolha com quem você quer ser atendido."
      />
      <div className="px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <BarberList barbers={barbers} headingLevel="h2" />
        </div>
      </div>
    </main>
  );
}
