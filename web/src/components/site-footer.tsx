import Image from "next/image";
import Link from "next/link";
import {
  BusinessHoursList,
  ContactList,
  InfoLabel,
  ShopAddress,
  hasContact,
} from "@/components/vitrine/shop-info";
import { getPublicShop } from "@/lib/api/public";

/**
 * Rodapé de todas as páginas, em mastro: o nome grande de ponta a ponta, o
 * horário e o contato abaixo, e a linha legal. O horário e o contato vêm de
 * `GET /public/shop`; se a API não responder, o rodapé fica só com o nome e
 * os links.
 */
export async function SiteFooter() {
  const shop = await getPublicShop();
  const name = shop?.name ?? "Augusto Barbearia";
  return (
    <footer className="border-t border-line-on-ink bg-ink px-4 text-surface sm:px-6 lg:px-8">
      <div className="mx-auto max-w-site pt-16 lg:pt-24">
        <div className="flex items-center gap-5 sm:gap-6">
          {/* O logo tem traços pretos: no fundo escuro ele fica num círculo claro. */}
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface sm:size-20">
            <Image src="/logo.png" alt="" width={56} height={56} />
          </span>
          <p className="min-w-0 font-heading text-display-1 font-normal [overflow-wrap:break-word]">
            {name}
          </p>
        </div>
        <div className="mt-12 grid gap-10 border-t border-line-on-ink pt-10 md:grid-cols-[repeat(2,minmax(0,1fr))] lg:mt-16 lg:grid-cols-12 lg:gap-8">
          {shop ? (
            <div className="lg:col-span-4">
              <InfoLabel as="h2">Horário de funcionamento</InfoLabel>
              <div className="mt-4">
                <BusinessHoursList days={shop.business_hours} />
              </div>
            </div>
          ) : null}
          {shop && hasContact(shop) ? (
            <div className="lg:col-span-4 lg:col-start-6">
              <InfoLabel as="h2">Contato</InfoLabel>
              <div className="mt-4 space-y-4">
                <ShopAddress address={shop.address ?? null} />
                <ContactList shop={shop} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
      <div className="mx-auto mt-14 max-w-site border-t border-line-on-ink lg:mt-20">
        <div className="flex flex-col items-start gap-2 py-5 text-sm text-on-ink-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {name}
          </p>
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center underline underline-offset-4 transition-colors duration-200 ease-standard hover:text-surface active:text-on-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface motion-reduce:transition-none"
          >
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
