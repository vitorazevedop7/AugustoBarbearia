import type { PublicShop } from "@/lib/api/public";
import { groupBusinessHours } from "@/lib/business-hours";
import { contactLinks, directionsUrl } from "@/lib/contact";

/** Rótulo pequeno das colunas sobre a faixa escura. */
export function InfoLabel({
  as: Tag = "h3",
  children,
}: {
  as?: "h2" | "h3" | "p";
  children: string;
}) {
  return (
    <Tag className="text-sm font-semibold text-on-ink-muted">{children}</Tag>
  );
}

const linkOnInk =
  "underline decoration-line-on-ink underline-offset-4 transition-colors duration-200 ease-standard hover:decoration-surface active:text-on-ink-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface motion-reduce:transition-none";

/**
 * Horário de funcionamento sobre a faixa escura, com os dias iguais juntos,
 * em linhas separadas por filetes. `lg` é o quadro grande da seção de
 * contato; o padrão é o do rodapé.
 */
export function BusinessHoursList({
  days,
  size = "md",
}: {
  days: PublicShop["business_hours"];
  size?: "md" | "lg";
}) {
  const large = size === "lg";
  return (
    <dl
      className={
        large
          ? "divide-y divide-line-on-ink border-y border-line-on-ink"
          : "space-y-2"
      }
    >
      {groupBusinessHours(days).map(({ days: label, hours }) => (
        <div
          key={label}
          className={`flex items-baseline justify-between gap-6 ${large ? "py-5" : ""}`}
        >
          <dt
            className={
              large ? "text-body text-on-ink-muted" : "text-on-ink-muted"
            }
          >
            {label}
          </dt>
          <dd
            className={`text-surface tabular-nums ${large ? "font-heading text-display-4 font-black uppercase" : "font-semibold"}`}
          >
            {hours}
          </dd>
        </div>
      ))}
    </dl>
  );
}

/** Endereço com "Como chegar". Nada aparece sem endereço preenchido. */
export function ShopAddress({ address }: { address: string | null }) {
  if (!address) return null;
  return (
    <address className="leading-relaxed text-surface not-italic">
      <p className="whitespace-pre-line">{address}</p>
      <a
        href={directionsUrl(address)}
        className={`mt-2 inline-flex min-h-11 items-center text-sm font-semibold ${linkOnInk}`}
      >
        Como chegar
        <span className="sr-only"> (abre o Google Maps)</span>
      </a>
    </address>
  );
}

/** Os contatos preenchidos (WhatsApp, telefone, Instagram, e-mail), como links. */
export function ContactList({ shop }: { shop: PublicShop }) {
  const links = contactLinks(shop);
  if (links.length === 0) return null;
  return (
    <ul className="space-y-1">
      {links.map(({ label, text, href }) => (
        <li key={label}>
          <a
            href={href}
            className={`inline-flex min-h-11 flex-wrap items-center gap-x-2 text-surface ${linkOnInk}`}
          >
            <span className="text-sm text-on-ink-muted">{label}</span>{" "}
            <span className="font-semibold wrap-anywhere">{text}</span>
          </a>
        </li>
      ))}
    </ul>
  );
}

/** Se a administração preencheu o endereço ou algum contato. */
export function hasContact(shop: PublicShop): boolean {
  return Boolean(shop.address) || contactLinks(shop).length > 0;
}
