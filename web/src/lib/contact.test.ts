import { describe, expect, it } from "vitest";
import { contactLinks, directionsUrl } from "./contact";

describe("contactLinks", () => {
  it("monta os links dos contatos preenchidos, na ordem da vitrine", () => {
    expect(
      contactLinks({
        phone: "7533334444",
        whatsapp: "75999990000",
        instagram: "augusto.barbearia",
        email: "contato@example.com",
      }),
    ).toEqual([
      {
        label: "WhatsApp",
        text: "(75) 99999-0000",
        href: "https://wa.me/5575999990000",
      },
      {
        label: "Telefone",
        text: "(75) 3333-4444",
        href: "tel:+557533334444",
      },
      {
        label: "Instagram",
        text: "@augusto.barbearia",
        href: "https://www.instagram.com/augusto.barbearia/",
      },
      {
        label: "E-mail",
        text: "contato@example.com",
        href: "mailto:contato@example.com",
      },
    ]);
  });

  it("deixa de fora o que a administração não preencheu", () => {
    expect(
      contactLinks({ phone: null, whatsapp: null, instagram: null }),
    ).toEqual([]);
  });
});

describe("directionsUrl", () => {
  it("busca o endereço no Google Maps", () => {
    expect(directionsUrl("Rua A, 10 - Centro")).toBe(
      "https://www.google.com/maps/search/?api=1&query=Rua%20A%2C%2010%20-%20Centro",
    );
  });
});
