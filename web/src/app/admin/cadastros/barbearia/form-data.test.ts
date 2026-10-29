import { describe, expect, it } from "vitest";
import { parseBusinessHoursForm, parseShopForm } from "./form-data";

function week(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  for (let weekday = 0; weekday < 7; weekday++) {
    formData.set(`dia-${weekday}-situacao`, "aberto");
    formData.set(`dia-${weekday}-abertura`, "10:00");
    formData.set(`dia-${weekday}-fechamento`, "19:00");
  }
  for (const [key, value] of Object.entries(overrides)) {
    formData.set(key, value);
  }
  return formData;
}

describe("parseBusinessHoursForm — RN-02", () => {
  it("envia os sete dias, com o dia fechado sem horas", () => {
    const result = parseBusinessHoursForm(
      week({ "dia-6-situacao": "fechado", "dia-6-abertura": "08:00" }),
    );

    expect(result).toEqual({
      days: [
        ...[0, 1, 2, 3, 4, 5].map((weekday) => ({
          weekday,
          opens_at: "10:00",
          closes_at: "19:00",
        })),
        { weekday: 6, opens_at: null, closes_at: null },
      ],
    });
  });

  it("pede as duas horas de um dia aberto", () => {
    expect(parseBusinessHoursForm(week({ "dia-5-fechamento": "" }))).toEqual({
      error:
        "Sábado: informe a abertura e o fechamento, ou marque como fechado.",
    });
  });

  it("deixa a API decidir se a abertura vem antes do fechamento", () => {
    const result = parseBusinessHoursForm(
      week({ "dia-0-abertura": "19:00", "dia-0-fechamento": "10:00" }),
    );

    expect(result).toMatchObject({
      days: expect.arrayContaining([
        { weekday: 0, opens_at: "19:00", closes_at: "10:00" },
      ]),
    });
  });
});

describe("parseShopForm", () => {
  it("envia os campos como foram digitados, e vazio quando ausente", () => {
    const formData = new FormData();
    formData.set("name", " Augusto Barbearia ");
    formData.set("phone", "(75) 99999-0000");

    expect(parseShopForm(formData)).toEqual({
      name: " Augusto Barbearia ",
      tagline: "",
      about: "",
      address: "",
      phone: "(75) 99999-0000",
      whatsapp: "",
      instagram: "",
      email: "",
    });
  });
});
