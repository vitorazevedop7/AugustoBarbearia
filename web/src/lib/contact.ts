import { formatPhone } from "./format";

/** Os dados de contato da barbearia, como a API devolve (só dígitos no telefone). */
export type ShopContact = {
  phone?: string | null;
  whatsapp?: string | null;
  instagram?: string | null;
  email?: string | null;
};

export type ContactLink = {
  /** O meio de contato: "WhatsApp", "Telefone", "Instagram", "E-mail". */
  label: string;
  /** O que aparece na tela: o número formatado, o @ ou o e-mail. */
  text: string;
  href: string;
};

/**
 * Os contatos preenchidos pela administração, já como links. Telefone e
 * WhatsApp ficam com DDD + número; o código do país (55) entra só no link.
 */
export function contactLinks(shop: ShopContact): ContactLink[] {
  const links: ContactLink[] = [];
  if (shop.whatsapp) {
    links.push({
      label: "WhatsApp",
      text: formatPhone(shop.whatsapp),
      href: `https://wa.me/55${shop.whatsapp}`,
    });
  }
  if (shop.phone) {
    links.push({
      label: "Telefone",
      text: formatPhone(shop.phone),
      href: `tel:+55${shop.phone}`,
    });
  }
  if (shop.instagram) {
    links.push({
      label: "Instagram",
      text: `@${shop.instagram}`,
      href: `https://www.instagram.com/${shop.instagram}/`,
    });
  }
  if (shop.email) {
    links.push({
      label: "E-mail",
      text: shop.email,
      href: `mailto:${shop.email}`,
    });
  }
  return links;
}

/** "Como chegar": a busca do endereço no Google Maps, sem mapa embutido. */
export function directionsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}
