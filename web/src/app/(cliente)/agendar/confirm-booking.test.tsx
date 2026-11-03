import { fireEvent, render, screen } from "@testing-library/react";
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

  it("RN-11: no limite, a recusa leva a Meus agendamentos, não a outro horário", async () => {
    vi.mocked(confirmBooking).mockResolvedValue({
      status: "error",
      message:
        "Você já tem 2 agendamentos marcados, que é o máximo. Para marcar outro, cancele um deles ou espere o próximo atendimento.",
      code: "APPOINTMENT_LIMIT_REACHED",
      phone: "",
    });
    render(<ConfirmBooking {...props} needsPhone={false} />);

    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    await screen.findByRole("alert");
    expect(
      screen.getByRole("link", { name: "Ver meus agendamentos" }),
    ).toHaveAttribute("href", "/meus-agendamentos");
    expect(
      screen.queryByRole("link", { name: "Escolher outro horário" }),
    ).toBeNull();
  });

  it("mostra o erro da API com o link para outro horário e mantém o telefone", async () => {
    vi.mocked(confirmBooking).mockResolvedValue({
      status: "error",
      message: "Este horário não está mais disponível. Escolha outro.",
      code: "SLOT_UNAVAILABLE",
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

  it("telefone recusado: mostra o que corrigir, sem levar a outro horário", async () => {
    vi.mocked(confirmBooking).mockResolvedValue({
      status: "error",
      message: "Informe o telefone com DDD.",
      code: "VALIDATION_ERROR",
      phone: "123",
    });
    render(<ConfirmBooking {...props} />);

    fireEvent.change(screen.getByLabelText("Telefone"), {
      target: { value: "123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: "Confirmar agendamento" }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Informe o telefone com DDD.");
    expect(
      screen.queryByRole("link", { name: "Escolher outro horário" }),
    ).toBeNull();
    expect(screen.getByLabelText("Telefone")).toHaveValue("123");
  });

  it("sem pedir telefone quando o perfil já tem", () => {
    render(<ConfirmBooking {...props} needsPhone={false} />);

    expect(screen.queryByLabelText("Telefone")).toBeNull();
  });
});
