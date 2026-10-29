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
 * Rodapé de todas as páginas. O horário e o contato vêm de `GET /public/shop`;
 * se a API não responder, o rodapé fica só com o nome e os links.
 */
export async function SiteFooter() {
  const shop = await getPublicShop();
  return (
    <footer className="bg-ink text-surface">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr] lg:px-8 lg:py-20">
        <div className="flex items-center gap-4 self-start">
          {/* O logo tem traços pretos: no fundo escuro ele fica num círculo claro. */}
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-surface">
            <Image src="/logo.png" alt="" width={48} height={48} />
          </span>
          <p className="font-heading text-display-3 font-bold">
            {shop?.name ?? "Augusto Barbearia"}
          </p>
        </div>
        {shop ? (
          <div>
            <InfoLabel as="h2">Horário de funcionamento</InfoLabel>
            <div className="mt-4">
              <BusinessHoursList days={shop.business_hours} />
            </div>
          </div>
        ) : null}
        {shop && hasContact(shop) ? (
          <div>
            <InfoLabel as="h2">Contato</InfoLabel>
            <div className="mt-4 space-y-4">
              <ShopAddress address={shop.address ?? null} />
              <ContactList shop={shop} />
            </div>
          </div>
        ) : null}
      </div>
      <div className="border-t border-line-on-ink">
        <div className="mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-4 text-sm text-on-ink-muted sm:flex-row sm:justify-between sm:px-6 lg:px-8">
          <p>
            © {new Date().getFullYear()} {shop?.name ?? "Augusto Barbearia"}
          </p>
          <Link
            href="/privacidade"
            className="inline-flex min-h-11 items-center underline underline-offset-4 transition-colors duration-300 ease-out hover:text-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface motion-reduce:transition-none"
          >
            Política de privacidade
          </Link>
        </div>
      </div>
    </footer>
  );
}
