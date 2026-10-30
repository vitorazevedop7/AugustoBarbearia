import Image from "next/image";
import { Suspense } from "react";
import { ApiStatus, ApiStatusBar } from "@/components/api-status";
import { RevealObserver } from "@/components/reveal-observer";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { SectionHeading } from "@/components/ui/section-heading";
import { BarberList, ServiceList } from "@/components/vitrine/catalog";
import {
  BusinessHoursList,
  ContactList,
  InfoLabel,
  ShopAddress,
  hasContact,
} from "@/components/vitrine/shop-info";
import {
  getPublicBarbers,
  getPublicServices,
  getPublicShop,
  type PublicShop,
} from "@/lib/api/public";
import { BOOKING_PATH } from "@/lib/booking";

/** A página inicial mostra só os primeiros serviços; o resto fica em /servicos. */
const FEATURED_SERVICES = 4;

const SHOP_NAME = "Augusto Barbearia";
const HERO_PHOTO_PATH = "/images/vitrine/hero.jpg";
const ABOUT_PHOTO_PATH = "/images/vitrine/sobre.jpg";

/** Vitrine (S3.05): só dados do sistema, com textos genéricos onde faltam. */
export default async function HomePage() {
  const [shop, services, barbers] = await Promise.all([
    getPublicShop(),
    getPublicServices(),
    getPublicBarbers(),
  ]);

  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <Hero shop={shop} />

      {shop?.about ? (
        <section
          aria-labelledby="sobre-titulo"
          className="px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
        >
          <div className="mx-auto grid max-w-7xl items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <div
              data-reveal
              className="group relative aspect-[3/2] overflow-hidden bg-line"
            >
              <Image
                src={ABOUT_PHOTO_PATH}
                alt="Mãos de barbeiro com tesoura durante um corte de cabelo"
                fill
                sizes="(min-width: 1344px) 608px, (min-width: 1024px) calc((100vw - 8rem) / 2), (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
                className="object-cover transition-transform duration-300 ease-out group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              />
            </div>
            <div data-reveal className="min-w-0 text-center lg:text-left">
              <div className="flex justify-center lg:justify-start">
                <Ornament align="start" />
              </div>
              <h2
                id="sobre-titulo"
                className="mt-6 font-heading text-display-2 font-bold text-ink"
              >
                Sobre a barbearia
              </h2>
              <p className="mt-6 text-base leading-relaxed whitespace-pre-line text-ink-muted sm:text-lg">
                {shop.about}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section
        id="servicos"
        aria-labelledby="servicos-titulo"
        className={`scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-32 ${shop?.about ? "bg-surface" : ""}`}
      >
        <div className="mx-auto max-w-7xl">
          <div data-reveal>
            <SectionHeading
              id="servicos-titulo"
              title="Serviços"
              description="Preço e duração de cada serviço, e quem realiza."
            />
          </div>
          <div className="mt-12 lg:mt-16">
            <ServiceList services={services} limit={FEATURED_SERVICES} />
          </div>
          {services && services.length > 0 ? (
            <div className="mt-10 text-center">
              <ButtonLink
                href="/servicos"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Ver todos os serviços
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </section>

      <section
        id="equipe"
        aria-labelledby="equipe-titulo"
        className={`scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-32 ${shop?.about ? "" : "bg-surface"}`}
      >
        <div className="mx-auto max-w-7xl">
          <div data-reveal>
            <SectionHeading
              id="equipe-titulo"
              title="Nossa equipe"
              description="Escolha com quem você quer ser atendido."
            />
          </div>
          <div className="mt-12 lg:mt-16">
            <BarberList barbers={barbers} />
          </div>
          {barbers && barbers.length > 0 ? (
            <div className="mt-10 text-center">
              <ButtonLink
                href="/barbeiros"
                variant="outline"
                className="w-full sm:w-auto"
              >
                Conhecer a equipe
              </ButtonLink>
            </div>
          ) : null}
        </div>
      </section>

      <ContactSection shop={shop} />
      <RevealObserver />

      {process.env.NODE_ENV === "development" && (
        <Suspense
          fallback={<ApiStatusBar tone="pending" label="verificando…" />}
        >
          <ApiStatus />
        </Suspense>
      )}
    </main>
  );
}

function Hero({ shop }: { shop: PublicShop | null }) {
  return (
    <section className="relative isolate overflow-hidden bg-ink px-4 py-24 text-center sm:px-6 lg:py-36">
      <Image
        src={HERO_PHOTO_PATH}
        alt=""
        fill
        sizes="100vw"
        preload
        fetchPriority="high"
        className="object-cover brightness-75"
      />
      <div aria-hidden="true" className="absolute inset-0 bg-ink/70" />
      <div className="relative mx-auto max-w-3xl">
        <div className="motion-safe:animate-rise">
          <Ornament tone="dark" />
        </div>
        <h1 className="mt-6 font-heading text-display-1 font-bold text-surface motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
          {shop?.name ?? SHOP_NAME}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-on-ink-muted sm:text-lg motion-safe:animate-rise motion-safe:[animation-delay:160ms]">
          {shop?.tagline ??
            "Escolha o serviço, o barbeiro e o horário pelo celular, sem precisar ligar."}
        </p>
        <div className="mt-10 flex flex-col gap-3 motion-safe:animate-rise motion-safe:[animation-delay:240ms] sm:flex-row sm:justify-center">
          <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
            Agendar horário
          </ButtonLink>
          <ButtonLink
            href="/servicos"
            variant="outline-light"
            className="w-full sm:w-auto"
          >
            Ver serviços
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}

/** Horário de funcionamento, endereço e contato, na faixa escura (#contato). */
function ContactSection({ shop }: { shop: PublicShop | null }) {
  const withContact = shop ? hasContact(shop) : false;
  return (
    <section
      id="contato"
      aria-labelledby="contato-titulo"
      className="scroll-mt-20 bg-ink px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div data-reveal>
          <SectionHeading
            id="contato-titulo"
            tone="dark"
            title="Horário e contato"
            description="Quando estamos abertos e como falar com a barbearia."
          />
        </div>
        <div className="mx-auto mt-12 max-w-4xl lg:mt-16">
          {shop ? (
            <div
              data-reveal
              className={`grid gap-10 ${withContact ? "md:grid-cols-2" : "mx-auto max-w-md"}`}
            >
              <div>
                <InfoLabel>Horário de funcionamento</InfoLabel>
                <div className="mt-4">
                  <BusinessHoursList days={shop.business_hours} />
                </div>
              </div>
              {withContact ? (
                <div>
                  <InfoLabel>Onde estamos e contato</InfoLabel>
                  <div className="mt-4 space-y-4">
                    <ShopAddress address={shop.address ?? null} />
                    <ContactList shop={shop} />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <Alert
              tone="danger"
              title="Não foi possível carregar o horário e o contato. Tente novamente em instantes."
            />
          )}
          <div className="mt-12 text-center">
            <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
              Agendar horário
            </ButtonLink>
          </div>
        </div>
      </div>
    </section>
  );
}
