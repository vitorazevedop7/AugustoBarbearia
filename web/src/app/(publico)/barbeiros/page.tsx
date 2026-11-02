import type { Metadata } from "next";
import { RevealObserver } from "@/components/reveal-observer";
import { BarberList } from "@/components/vitrine/catalog";
import { PageHero } from "@/components/vitrine/page-hero";
import { PhotoMosaic } from "@/components/vitrine/photo-mosaic";
import { getPublicBarbers, getPublicShop } from "@/lib/api/public";
import { vitrinePhotos } from "@/lib/vitrine-photos";

export const metadata: Metadata = {
  title: "Barbeiros — Augusto Barbearia",
  description:
    "Conheça os barbeiros da Augusto Barbearia e agende com quem você preferir.",
};

/** A equipe ativa (RN-60), cada barbeiro com a chamada para agendar com ele. */
export default async function BarbersPage() {
  const [barbers, shop] = await Promise.all([
    getPublicBarbers(),
    getPublicShop(),
  ]);
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <PageHero
        photo={vitrinePhotos.teamHero}
        title="Barbeiros"
        description="Conheça a equipe e escolha com quem você quer ser atendido."
      >
        <BarberList barbers={barbers} headingLevel="h2" fullBio />
      </PageHero>
      <PhotoMosaic instagram={shop?.instagram} />
      <RevealObserver />
    </main>
  );
}
