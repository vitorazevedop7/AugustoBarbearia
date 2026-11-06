import type { Metadata } from "next";
import { RevealObserver } from "@/components/reveal-observer";
import { ServiceList } from "@/components/vitrine/catalog";
import { PageHero } from "@/components/vitrine/page-hero";
import { PhotoMosaic } from "@/components/vitrine/photo-mosaic";
import { getPublicServices, getPublicShop } from "@/lib/api/public";
import { vitrinePhotos } from "@/lib/vitrine-photos";

export const metadata: Metadata = {
  title: "Serviços — Augusto Barbearia",
  description:
    "Os serviços da Augusto Barbearia, com preço, duração e quem realiza cada um.",
};

/** Todos os serviços oferecidos (RN-61), cada um com a chamada para agendar. */
export default async function ServicesPage() {
  const [services, shop] = await Promise.all([
    getPublicServices(),
    getPublicShop(),
  ]);
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHero
        photo={vitrinePhotos.servicesHero}
        band={false}
        title="Serviços"
        description="Preço e duração de cada serviço, e quem realiza. Escolha um para agendar."
      >
        <ServiceList services={services} headingLevel="h2" />
      </PageHero>
      <PhotoMosaic instagram={shop?.instagram} />
      <RevealObserver />
    </main>
  );
}
