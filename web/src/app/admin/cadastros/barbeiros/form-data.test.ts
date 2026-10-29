import { describe, expect, it } from "vitest";
import {
  noticeMessage,
  parseBarberForm,
  parseBarberId,
  parseBarberUpdateForm,
} from "./form-data";

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("parseBarberForm — RN-60", () => {
  it("envia os campos como foram digitados, e vazio quando ausente", () => {
    expect(
      parseBarberForm(form({ name: " Lauro ", bio: "  ", situacao: "ativo" })),
    ).toEqual({ name: " Lauro ", photo_path: "", bio: "  " });
  });
});

describe("parseBarberUpdateForm — RN-60", () => {
  const fields = {
    name: "Manoel",
    photo_path: "/images/barbeiros/manoel.jpg",
    bio: "Navalha e tesoura.",
  };

  it("envia ativo como true", () => {
    expect(
      parseBarberUpdateForm(form({ ...fields, situacao: "ativo" })),
    ).toEqual({ ...fields, active: true });
  });

  it("envia inativo como false", () => {
    expect(
      parseBarberUpdateForm(form({ ...fields, situacao: "inativo" })),
    ).toEqual({ ...fields, active: false });
  });

  it("não envia a situação ausente ou desconhecida", () => {
    expect(parseBarberUpdateForm(form(fields))).toEqual(fields);
    expect(
      parseBarberUpdateForm(form({ ...fields, situacao: "talvez" })),
    ).toEqual(fields);
  });
});

describe("parseBarberId", () => {
  it("aceita um id inteiro positivo", () => {
    expect(parseBarberId("1")).toBe(1);
    expect(parseBarberId("2147483647")).toBe(2147483647);
  });

  it("recusa o que não é um id possível", () => {
    for (const value of ["", "0", "-1", "01", "1.5", "abc", "2147483648"]) {
      expect(parseBarberId(value)).toBeNull();
    }
  });
});

describe("noticeMessage", () => {
  it("traduz os avisos conhecidos", () => {
    expect(noticeMessage("cadastrado")).toBe("Barbeiro cadastrado.");
    expect(noticeMessage("atualizado")).toBe("Barbeiro atualizado.");
  });

  it("ignora qualquer outro texto da URL", () => {
    expect(noticeMessage(undefined)).toBeUndefined();
    expect(noticeMessage("Você ganhou um prêmio")).toBeUndefined();
    expect(noticeMessage("toString")).toBeUndefined();
    expect(noticeMessage(["cadastrado", "atualizado"])).toBeUndefined();
  });
});
