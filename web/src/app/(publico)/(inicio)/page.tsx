import { Suspense } from "react";
import { ApiStatus, ApiStatusBar } from "@/components/api-status";
import { RevealObserver } from "@/components/reveal-observer";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { FixedPhotoLayer } from "@/components/ui/fixed-photo-layer";
import { FramedPhoto } from "@/components/ui/framed-photo";
import { Ornament } from "@/components/ui/ornament";
import { SectionHeading } from "@/components/ui/section-heading";
import { BarberList, ServiceList } from "@/components/vitrine/catalog";
import { BookingBand } from "@/components/vitrine/booking-band";
import { Gallery } from "@/components/vitrine/gallery";
import { HowItWorks } from "@/components/vitrine/how-it-works";
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
import { contactLinks } from "@/lib/contact";
import { vitrinePhotos } from "@/lib/vitrine-photos";

/** A página inicial mostra só os primeiros serviços; o resto fica em /servicos. */
const FEATURED_SERVICES = 4;

const SHOP_NAME = "Augusto Barbearia";

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
          className="px-4 py-section sm:px-6 lg:px-8"
        >
          <div className="mx-auto grid max-w-site items-center gap-10 lg:grid-cols-12 lg:gap-8">
            <div data-reveal="rise" className="min-w-0 lg:col-span-5">
              <h2
                id="sobre-titulo"
                className="font-heading text-display-2 font-normal text-ink"
              >
                Sobre a barbearia
              </h2>
              <p className="mt-6 max-w-xl text-body whitespace-pre-line text-ink-muted">
                {shop.about}
              </p>
            </div>
            <FramedPhoto
              photo={vitrinePhotos.about}
              data-reveal="zoom"
              ratioClassName="aspect-[4/3]"
              className="lg:col-span-7"
              sizes="(min-width: 1404px) 760px, (min-width: 1024px) calc((100vw - 4rem) * 7 / 12), (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
            />
          </div>
        </section>
      ) : null}

      <section
        id="servicos"
        aria-labelledby="servicos-titulo"
        className={`px-4 py-section-l sm:px-6 lg:px-8 ${shop?.about ? "bg-surface" : ""}`}
      >
        <div className="mx-auto max-w-site">
          <div data-reveal="rise">
            <SectionHeading
              id="servicos-titulo"
              title="Serviços"
              description="Preço e duração de cada serviço, e quem realiza."
              aside={
                services && services.length > 0 ? (
                  <ButtonLink
                    href="/servicos"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Ver todos os serviços
                  </ButtonLink>
                ) : null
              }
            />
          </div>
          <div className="mt-12 lg:mt-16">
            <ServiceList services={services} limit={FEATURED_SERVICES} />
          </div>
        </div>
      </section>

      <Gallery surface={!shop?.about} />
      <BookingBand />

      <section
        id="equipe"
        aria-labelledby="equipe-titulo"
        className="bg-paper px-4 py-section sm:px-6 lg:px-8"
      >
        <div className="mx-auto max-w-site">
          <div data-reveal="rise">
            <SectionHeading
              id="equipe-titulo"
              title="Nossa equipe"
              description="Escolha com quem você quer ser atendido."
              aside={
                barbers && barbers.length > 0 ? (
                  <ButtonLink
                    href="/barbeiros"
                    variant="outline"
                    className="w-full sm:w-auto"
                  >
                    Conhecer a equipe
                  </ButtonLink>
                ) : null
              }
            />
          </div>
          <div className="mt-12 lg:mt-16">
            <BarberList barbers={barbers} />
          </div>
        </div>
      </section>

      <HowItWorks />
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

/**
 * Hero de tela inteira (postura Ledge): a foto ocupa a tela e o nome descansa
 * embaixo, à esquerda, sobre um degradê que escurece só o lado do texto. O
 * cabeçalho transparente fica por cima (`HeaderFrame`) e rola com a página.
 * No desktop, a foto fica numa camada fixa na tela, e o `clip-path` do hero a
 * recorta: ela fica parada enquanto a página rola, o que o
 * `background-attachment: fixed` não garante no Safari. No celular, a camada
 * é comum e rola junto.
 */
function Hero({ shop }: { shop: PublicShop | null }) {
  return (
    <section className="relative isolate flex min-h-svh items-end bg-ink px-4 pt-32 pb-14 [clip-path:inset(0)] sm:px-6 sm:pb-16 lg:px-8 lg:pb-20">
      <FixedPhotoLayer
        photo={vitrinePhotos.hero}
        preload
        overlayClassName="bg-linear-to-tr from-ink/90 via-ink/55 to-ink/15"
      />
      <div className="relative mx-auto w-full max-w-site">
        <div className="max-w-4xl">
          <div className="motion-safe:animate-rise">
            <Ornament align="start" tone="dark" />
          </div>
          <h1 className="mt-6 font-heading text-display-hero font-normal text-surface motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
            {shop?.name ?? SHOP_NAME}
          </h1>
          <p className="mt-6 max-w-xl text-lead text-surface motion-safe:animate-rise motion-safe:[animation-delay:160ms]">
            {shop?.tagline ??
              "Escolha o serviço, o barbeiro e o horário pelo celular, sem precisar ligar."}
          </p>
          <div className="mt-9 flex flex-col gap-3 motion-safe:animate-rise motion-safe:[animation-delay:240ms] sm:flex-row">
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
      </div>
    </section>
  );
}

/**
 * O que a seção de contato promete, conforme o que a administração preencheu:
 * sem endereço nem contato, ela fala só do horário.
 */
function contactCopy(shop: PublicShop | null) {
  const hasAddress = Boolean(shop?.address);
  const hasLinks = shop ? contactLinks(shop).length > 0 : false;
  if (hasLinks) {
    return {
      description: "Quando estamos abertos e como falar com a barbearia.",
      label: hasAddress ? "Onde estamos e contato" : "Contato",
    };
  }
  if (hasAddress) {
    return {
      description: "Quando estamos abertos e onde estamos.",
      label: "Onde estamos",
    };
  }
  return { description: "Quando estamos abertos.", label: "" };
}

/**
 * Horário de funcionamento, endereço e contato, na faixa escura (#contato):
 * o título e o botão à esquerda, o quadro de horários e os contatos à direita.
 */
function ContactSection({ shop }: { shop: PublicShop | null }) {
  const withContact = shop ? hasContact(shop) : false;
  const copy = contactCopy(shop);
  return (
    <section
      id="contato"
      aria-labelledby="contato-titulo"
      className="bg-ink px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-site gap-12 lg:grid-cols-12 lg:gap-8">
        <div data-reveal="rise" className="lg:col-span-5">
          <h2
            id="contato-titulo"
            className="font-heading text-display-2 font-normal text-surface"
          >
            Horário e contato
          </h2>
          <p className="mt-5 max-w-md text-body text-on-ink-muted">
            {shop
              ? copy.description
              : "Quando estamos abertos e como falar com a barbearia."}
          </p>
          <div className="mt-10">
            <ButtonLink href={BOOKING_PATH} className="w-full sm:w-auto">
              Agendar horário
            </ButtonLink>
          </div>
        </div>
        <div
          data-reveal="rise"
          className="min-w-0 lg:col-span-6 lg:col-start-7"
        >
          {shop ? (
            <div className="grid gap-12">
              <div>
                <InfoLabel>Horário de funcionamento</InfoLabel>
                <div className="mt-4">
                  <BusinessHoursList days={shop.business_hours} size="lg" />
                </div>
              </div>
              {withContact ? (
                <div>
                  <InfoLabel>{copy.label}</InfoLabel>
                  <div className="mt-4 grid gap-6 sm:grid-cols-[repeat(2,minmax(0,1fr))]">
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
        </div>
      </div>
    </section>
  );
}
