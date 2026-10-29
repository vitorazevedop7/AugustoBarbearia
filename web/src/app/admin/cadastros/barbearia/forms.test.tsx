import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BusinessHoursForm } from "./business-hours-form";
import { ShopForm } from "./shop-form";

vi.mock("./actions", () => ({
  saveShop: vi.fn(),
  saveBusinessHours: vi.fn(),
}));

describe("BusinessHoursForm — RN-02", () => {
  it("mostra cada dia com a situação e as horas salvas", () => {
    render(
      <BusinessHoursForm
        days={[
          { weekday: 0, opens_at: "10:00:00", closes_at: "19:00:00" },
          { weekday: 6, opens_at: null, closes_at: null },
        ]}
      />,
    );

    const monday = screen.getByRole("group", { name: "Segunda-feira" });
    expect(monday).toBeInTheDocument();
    expect(screen.getAllByLabelText("Situação")[0]).toHaveValue("aberto");
    expect(screen.getAllByLabelText("Abertura")[0]).toHaveValue("10:00");
    expect(screen.getAllByLabelText("Fechamento")[0]).toHaveValue("19:00");
    expect(screen.getAllByLabelText("Situação")[6]).toHaveValue("fechado");
    expect(screen.getAllByLabelText("Abertura")[6]).not.toBeRequired();
  });
});

describe("ShopForm", () => {
  it("mostra telefone formatado e Instagram com @", () => {
    render(
      <ShopForm
        shop={{
          name: "Augusto Barbearia",
          phone: "75999990000",
          instagram: "augusto",
          address: null,
        }}
      />,
    );

    expect(screen.getByLabelText("Nome")).toHaveValue("Augusto Barbearia");
    expect(screen.getByLabelText("Telefone (opcional)")).toHaveValue(
      "(75) 99999-0000",
    );
    expect(screen.getByLabelText("Instagram (opcional)")).toHaveValue(
      "@augusto",
    );
    expect(screen.getByLabelText("Endereço (opcional)")).toHaveValue("");
  });
});
