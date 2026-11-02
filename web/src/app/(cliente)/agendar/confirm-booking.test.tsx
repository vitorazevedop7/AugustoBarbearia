import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { confirmBooking } from "./actions";
import { ConfirmBooking } from "./confirm-booking";

vi.mock("./actions", () => ({ confirmBooking: vi.fn() }));

const props = {
  summary: [
    { label: "Barbeiro", value: "Edvaldo", changeHref: "/agendar" },
    { label: "Horário", value: "10:00 às 10:45" },
  ],
  slot: {
    starts_at: "2026-11-03T10:00:00-03:00",
    ends_at: "2026-11-03T10:45:00-03:00",
  },
  barberId: 1,
  serviceId: 2,
  needsPhone: true,
  changeTimeHref: "/agendar?barbeiro=1&servico=2&data=2026-11-03",
  backHref: "/agendar?barbeiro=1&servico=2&data=2026-11-03&hora=10:00",
};

describe("ConfirmBooking", () => {
  beforeEach(() => {
    vi.mocked(confirmBooking).mockReset();
  });

  it("depois de confirmar, mostra o resumo e o link para Meus agendamentos", async () => {
    vi.mocked(confirmBooking).mockResolvedValue({
      status: "success",
      phone: "11987654321",
      appointment: {
        id: 7,
        status: "SCHEDULED",
        barber: { id: 1, name: "Edvaldo" },
        service: { id: 2, name: "Corte + Barba" },
        starts_at: "2026-11-03T10:00:00-03:00",
        ends_at: "2026-11-03T10:45:00-03:00",
        price: "35.00",
        duration_minutes: 45,
        canceled_at: null,
        canceled_by: null,
        change_deadline: "2026-11-03T08:00:00-03:00",
        can_cancel: true,
        can_reschedule: true,
      },
    });
    render(<ConfirmBooking {...props} />);

    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "11987654321" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    const heading = await screen.findByRole("heading", {
      level: 1,
      name: "Horário confirmado",
    });
    await waitFor(() => expect(heading).toHaveFocus());
    expect(screen.getByRole("status")).toHaveTextContent(
      "Seu horário está confirmado para terça-feira, 3 de novembro de 2026, às 10:00.",
    );
    expect(screen.getByText("Corte + Barba · 45 min")).toBeVisible();
    expect(screen.getByText("R$ 35,00")).toBeVisible();
    expect(
      screen.getByRole("link", { name: "Ver meus agendamentos" }),
    ).toHaveAttribute("href", "/meus-agendamentos");
    expect(screen.queryByRole("button")).toBeNull();
    const data = vi.mocked(confirmBooking).mock.calls[0][1];
    expect(data.get("phone")).toBe("11987654321");
    expect(data.get("starts_at")).toBe("2026-11-03T10:00:00-03:00");
    expect(data.get("voltar")).toBe(props.backHref);
  });

  it("mostra o erro da API com o link para outro horário e mantém o telefone", async () => {
    vi.mocked(confirmBooking).mockResolvedValue({
      status: "error",
      message: "Este horário não está mais disponível. Escolha outro.",
      phone: "98765",
    });
    render(<ConfirmBooking {...props} />);

    expect(screen.getByLabelText("Telefone")).toBeRequired();
    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "98765" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Este horário não está mais disponível. Escolha outro.",
    );
    expect(
      screen.getByRole("link", { name: "Escolher outro horário" }),
    ).toHaveAttribute("href", props.changeTimeHref);
    expect(screen.getByLabelText("Telefone")).toHaveValue("98765");
  });

  it("sem pedir telefone quando o perfil já tem", () => {
    render(<ConfirmBooking {...props} needsPhone={false} />);

    expect(screen.queryByLabelText("Telefone")).toBeNull();
  });
});
