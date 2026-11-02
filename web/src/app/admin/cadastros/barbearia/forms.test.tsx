import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { saveBusinessHours } from "./actions";
import { BusinessHoursForm } from "./business-hours-form";
import { ShopForm } from "./shop-form";

vi.mock("./actions", () => ({
  saveShop: vi.fn(),
  saveBusinessHours: vi.fn(),
}));

describe("BusinessHoursForm — RN-02", () => {
  it("mostra a mensagem de conflito da API e preserva o expediente enviado", async () => {
    const message =
      "Há agendamentos futuros fora do novo horário de funcionamento. Remarque esses agendamentos antes de alterar o horário.";
    vi.mocked(saveBusinessHours).mockResolvedValueOnce({
      status: "error",
      message,
      values: { "dia-0-fechamento": "17:00" },
    });
    render(
      <BusinessHoursForm
        days={[{ weekday: 0, opens_at: "10:00:00", closes_at: "19:00:00" }]}
      />,
    );
    fireEvent.change(screen.getAllByLabelText("Fechamento")[0], {
      target: { value: "17:00" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Salvar horário" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(message);
    expect(screen.getAllByLabelText("Fechamento")[0]).toHaveValue("17:00");
    expect(screen.getAllByLabelText("Abertura")[0]).toHaveValue("10:00");
    expect(screen.queryByRole("status")).toBeNull();
  });

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
