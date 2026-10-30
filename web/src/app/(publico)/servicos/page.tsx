import type { Metadata } from "next";
import { RevealObserver } from "@/components/reveal-observer";
import { ServiceList } from "@/components/vitrine/catalog";
import { PageHero } from "@/components/vitrine/page-hero";
import { getPublicServices } from "@/lib/api/public";

export const metadata: Metadata = {
  title: "Serviços — Augusto Barbearia",
  description:
    "Os serviços da Augusto Barbearia, com preço, duração e quem realiza cada um.",
};

/** Todos os serviços oferecidos (RN-61), cada um com a chamada para agendar. */
export default async function ServicesPage() {
  const services = await getPublicServices();
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHero
        title="Serviços"
        description="Preço e duração de cada serviço, e quem realiza. Escolha um para agendar."
      />
      <div className="px-4 py-20 sm:px-6 lg:px-8 lg:py-32">
        <div className="mx-auto max-w-7xl">
          <ServiceList services={services} headingLevel="h2" />
        </div>
      </div>
      <RevealObserver />
    </main>
  );
}
