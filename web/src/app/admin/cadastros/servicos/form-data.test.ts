import { describe, expect, it } from "vitest";
import {
  noticeMessage,
  parseServiceForm,
  parseServiceId,
  parseServiceUpdateForm,
} from "./form-data";

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

const fields = {
  name: " Corte Simples ",
  description: "",
  price: "25,00",
  duration_minutes: "30",
  "barbeiro-1": "on",
  "barbeiro-3": "on",
};

describe("parseServiceForm — RN-61", () => {
  it("envia o preço como texto, a duração como número e os barbeiros marcados", () => {
    expect(parseServiceForm(form({ ...fields, situacao: "ativo" }))).toEqual({
      name: " Corte Simples ",
      description: "",
      price: "25,00",
      duration_minutes: 30,
      barber_ids: [1, 3],
    });
  });

  it("envia vazio o que não veio e nenhum barbeiro quando nada foi marcado", () => {
    const body = parseServiceForm(form({}));

    expect(body).toEqual({
      name: "",
      description: "",
      price: "",
      duration_minutes: Number.NaN,
      barber_ids: [],
    });
    // NaN vira null no JSON, e a API recusa a duração ausente.
    expect(JSON.parse(JSON.stringify(body)).duration_minutes).toBeNull();
  });

  it("não arredonda uma duração quebrada e ignora campos parecidos com barbeiro", () => {
    const body = parseServiceForm(
      form({
        duration_minutes: "30.5",
        "barbeiro-0": "on",
        "barbeiro-abc": "on",
        "barbeiro-2": "on",
      }),
    );

    expect(body.duration_minutes).toBeNaN();
    expect(body.barber_ids).toEqual([2]);
  });

  it("mantém o sinal da duração para a API explicar a regra", () => {
    expect(
      parseServiceForm(form({ duration_minutes: " -10 " })).duration_minutes,
    ).toBe(-10);
  });
});

describe("parseServiceUpdateForm — RN-61", () => {
  const body = {
    name: " Corte Simples ",
    description: "",
    price: "25,00",
    duration_minutes: 30,
    barber_ids: [1, 3],
  };

  it("envia ativo como true e inativo como false", () => {
    expect(
      parseServiceUpdateForm(form({ ...fields, situacao: "ativo" })),
    ).toEqual({ ...body, active: true });
    expect(
      parseServiceUpdateForm(form({ ...fields, situacao: "inativo" })),
    ).toEqual({ ...body, active: false });
  });

  it("não envia a situação ausente ou desconhecida", () => {
    expect(parseServiceUpdateForm(form(fields))).toEqual(body);
    expect(
      parseServiceUpdateForm(form({ ...fields, situacao: "talvez" })),
    ).toEqual(body);
  });
});

describe("parseServiceId", () => {
  it("aceita um id inteiro positivo", () => {
    expect(parseServiceId("1")).toBe(1);
    expect(parseServiceId("2147483647")).toBe(2147483647);
  });

  it("recusa o que não é um id possível", () => {
    for (const value of ["", "0", "-1", "01", "1.5", "abc", "2147483648"]) {
      expect(parseServiceId(value)).toBeNull();
    }
  });
});

describe("noticeMessage", () => {
  it("traduz os avisos conhecidos", () => {
    expect(noticeMessage("cadastrado")).toBe("Serviço cadastrado.");
    expect(noticeMessage("atualizado")).toBe("Serviço atualizado.");
  });

  it("ignora qualquer outro texto da URL", () => {
    expect(noticeMessage(undefined)).toBeUndefined();
    expect(noticeMessage("Você ganhou um prêmio")).toBeUndefined();
    expect(noticeMessage("toString")).toBeUndefined();
    expect(noticeMessage(["cadastrado", "atualizado"])).toBeUndefined();
  });
});
