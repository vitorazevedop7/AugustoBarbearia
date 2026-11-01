import { describe, expect, it } from "vitest";
import {
  listHref,
  noticeMessage,
  parseCustomerForm,
  parseCustomerId,
  parseCustomerUpdateForm,
  parsePage,
  parseQuery,
} from "./form-data";

function form(fields: Record<string, string>) {
  const formData = new FormData();
  for (const [key, value] of Object.entries(fields)) formData.set(key, value);
  return formData;
}

describe("parseCustomerForm — RN-20", () => {
  it("envia os campos como foram digitados, e vazio quando ausente", () => {
    expect(
      parseCustomerForm(form({ name: " Ana ", phone: "(75) 99999-0000" })),
    ).toEqual({ name: " Ana ", phone: "(75) 99999-0000", email: "" });
  });
});

describe("parseCustomerUpdateForm — RN-62", () => {
  it("não envia o telefone em branco, porque ele não se apaga", () => {
    expect(
      parseCustomerUpdateForm(form({ name: "Ana", phone: "  ", email: "" })),
    ).toEqual({ name: "Ana", email: "" });
  });

  it("envia o telefone informado", () => {
    expect(
      parseCustomerUpdateForm(
        form({ name: "Ana", phone: "75999990000", email: "a@b.com" }),
      ),
    ).toEqual({ name: "Ana", phone: "75999990000", email: "a@b.com" });
  });
});

describe("parseCustomerId", () => {
  it.each(["1", "42", "2147483647"])("aceita %s", (value) => {
    expect(parseCustomerId(value)).toBe(Number(value));
  });

  it.each(["0", "-1", "01", "abc", "1.5", "2147483648", "99999999999"])(
    "recusa %s",
    (value) => {
      expect(parseCustomerId(value)).toBeNull();
    },
  );
});

describe("parsePage e parseQuery", () => {
  it("usa a primeira página quando o valor não vale", () => {
    expect(parsePage(undefined)).toBe(1);
    expect(parsePage(["2", "3"])).toBe(1);
    expect(parsePage("0")).toBe(1);
    expect(parsePage("abc")).toBe(1);
    expect(parsePage("-4")).toBe(1);
    expect(parsePage("123456")).toBe(1);
    expect(parsePage("3")).toBe(3);
  });

  it("apara a busca e ignora o que não é texto", () => {
    expect(parseQuery("  ana  ")).toBe("ana");
    expect(parseQuery(undefined)).toBe("");
    expect(parseQuery(["a", "b"])).toBe("");
  });
});

describe("listHref", () => {
  it("mantém a busca e só marca a página depois da primeira", () => {
    expect(listHref({ q: "", page: 1 })).toBe("/admin/clientes");
    expect(listHref({ q: "ana souza", page: 1 })).toBe(
      "/admin/clientes?q=ana+souza",
    );
    expect(listHref({ q: "ana", page: 3 })).toBe(
      "/admin/clientes?q=ana&pagina=3",
    );
    expect(listHref({ q: "", page: 2 })).toBe("/admin/clientes?pagina=2");
  });
});

describe("noticeMessage", () => {
  it("só mostra os avisos conhecidos", () => {
    expect(noticeMessage("cadastrado")).toBe("Cliente cadastrado.");
    expect(noticeMessage("atualizado")).toBe("Cliente atualizado.");
    expect(noticeMessage("<b>oi</b>")).toBeUndefined();
    expect(noticeMessage("constructor")).toBeUndefined();
    expect(noticeMessage(undefined)).toBeUndefined();
  });
});
