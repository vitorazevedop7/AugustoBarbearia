import { Suspense } from "react";
import { ApiStatus, ApiStatusBar } from "@/components/api-status";
import { RevealObserver } from "@/components/reveal-observer";
import { Alert } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { FloatingOrnament } from "@/components/ui/floating-ornament";
import { FixedPhotoLayer } from "@/components/ui/fixed-photo-layer";
import { FramedPhoto } from "@/components/ui/framed-photo";
import { Ornament } from "@/components/ui/ornament";
import { SectionHeading } from "@/components/ui/section-heading";
import { BarberList, ServiceList } from "@/components/vitrine/catalog";
import { Gallery } from "@/components/vitrine/gallery";
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
          className="relative isolate overflow-hidden px-4 py-section sm:px-6 lg:px-8"
        >
          <FloatingOrnament
            shape="razor"
            className="top-24 -right-24 w-[26rem] xl:w-[32rem]"
          />
          <div className="mx-auto grid max-w-site items-center gap-10 lg:grid-cols-2 lg:gap-16">
            <FramedPhoto
              photo={vitrinePhotos.about}
              data-reveal="zoom"
              sizes="(min-width: 1344px) 608px, (min-width: 1024px) calc((100vw - 8rem) / 2), (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
            />
            <div
              data-reveal="rise"
              className="min-w-0 text-center lg:text-left"
            >
              <div className="flex justify-center lg:justify-start">
                <Ornament align="start" />
              </div>
              <h2
                id="sobre-titulo"
                className="mt-6 font-heading text-display-2 font-black uppercase text-ink"
              >
                Sobre a barbearia
              </h2>
              <p className="mt-6 text-body whitespace-pre-line text-ink-muted">
                {shop.about}
              </p>
            </div>
          </div>
        </section>
      ) : null}

      <section
        id="servicos"
        aria-labelledby="servicos-titulo"
        className={`relative isolate overflow-hidden px-4 py-section sm:px-6 lg:px-8 ${shop?.about ? "bg-surface" : ""}`}
      >
        <FloatingOrnament
          shape="scissors"
          className="top-20 -left-10 h-80 xl:left-6 xl:h-96"
        />
        <div className="mx-auto max-w-site">
          <div data-reveal="rise">
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

      <Gallery surface={!shop?.about} />

      <section
        id="equipe"
        aria-labelledby="equipe-titulo"
        className={`relative isolate overflow-hidden px-4 py-section sm:px-6 lg:px-8 ${shop?.about ? "bg-surface" : "bg-paper"}`}
      >
        <FloatingOrnament
          shape="comb"
          className="top-28 -right-16 w-80 xl:right-0 xl:w-[26rem]"
        />
        <div className="mx-auto max-w-site">
          <div data-reveal="rise">
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

/**
 * Hero de tela inteira, com o cabeçalho transparente por cima (`HeaderFrame`),
 * que rola com a página.
 * No desktop, a foto fica numa camada fixa na tela, e o `clip-path` do hero a
 * recorta: ela fica parada enquanto a página rola, o que o
 * `background-attachment: fixed` não garante no Safari. No celular, a camada
 * é comum e rola junto.
 */
function Hero({ shop }: { shop: PublicShop | null }) {
  return (
    <section className="relative isolate flex min-h-svh items-center justify-center bg-ink px-4 pt-32 pb-20 text-center [clip-path:inset(0)] sm:px-6 lg:pt-36 lg:pb-28">
      <FixedPhotoLayer
        photo={vitrinePhotos.hero}
        preload
        imageClassName="brightness-75"
      />
      <div className="relative mx-auto w-full max-w-3xl">
        <div className="motion-safe:animate-rise">
          <Ornament tone="dark" />
        </div>
        <h1 className="mt-6 font-heading text-display-1 font-black uppercase text-surface motion-safe:animate-rise motion-safe:[animation-delay:200ms]">
          {shop?.name ?? SHOP_NAME}
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-body text-on-ink-muted motion-safe:animate-rise motion-safe:[animation-delay:400ms]">
          {shop?.tagline ??
            "Escolha o serviço, o barbeiro e o horário pelo celular, sem precisar ligar."}
        </p>
        <div className="mt-10 flex flex-col gap-3 motion-safe:animate-rise motion-safe:[animation-delay:600ms] sm:flex-row sm:justify-center">
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
      className="bg-ink px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-site">
        <div data-reveal="rise">
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
              data-reveal="rise"
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
