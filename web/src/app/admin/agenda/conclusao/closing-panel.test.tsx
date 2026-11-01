import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { adminAppointment } from "@/test/agenda-data";
import type { AgendaState } from "../agenda-state";
import { AppointmentClosing } from "./closing-panel";
import { hasNotStarted, noticeHref, noticeMessage } from "./closing-state";

vi.mock("./actions", () => ({
  completeAppointment: vi.fn(),
  markNoShow: vi.fn(),
  correctPayment: vi.fn(),
}));

const agenda: AgendaState = { data: "2026-11-03", visao: "dia" };
// O agendamento de teste é terça, 3/11/2026, 10:00 em São Paulo (13:00Z).
const after = new Date("2026-11-03T13:50:00Z");
const before = new Date("2026-11-03T12:59:00Z");

function renderClosing(
  changes: Parameters<typeof adminAppointment>[0],
  now: Date,
) {
  render(
    <AppointmentClosing
      appointment={adminAppointment(changes)}
      agenda={agenda}
      now={now}
    />,
  );
}

describe("fechamento do agendamento — RN-31, RN-33, RN-40, RN-41", () => {
  it("oferece o valor preenchido, as quatro formas e a falta (RN-40)", () => {
    renderClosing({}, after);

    expect(
      screen.getByRole("heading", { name: "Concluir atendimento" }),
    ).toBeInTheDocument();
    const amount = screen.getByLabelText("Valor cobrado (R$)");
    expect(amount).toHaveValue("35,00");
    expect(amount).toBeRequired();
    expect(amount).toHaveAttribute("inputmode", "decimal");

    const group = screen.getByRole("group", { name: "Forma de pagamento" });
    const methods = within(group).getAllByRole("radio");
    expect(methods.map((radio) => radio.getAttribute("value"))).toEqual([
      "CASH",
      "PIX",
      "DEBIT",
      "CREDIT",
    ]);
    // Nenhuma vem marcada: a escolha é sempre da administração.
    for (const radio of methods) {
      expect(radio).not.toBeChecked();
      expect(radio).toBeRequired();
    }
    expect(within(group).getByText("Dinheiro")).toBeInTheDocument();
    expect(within(group).getByText("Crédito")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    ).toHaveAttribute("type", "submit");
    expect(screen.getByText("Marcar falta")).toBeInTheDocument();
    expect(
      screen.getByText("Isso não pode ser desfeito.", { exact: false }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Confirmar falta" }),
    ).toHaveAttribute("type", "submit");
  });

  it("antes do início só avisa quando poderá concluir (RN-31)", () => {
    renderClosing({}, before);

    expect(
      screen.getByText(
        "O atendimento pode ser concluído ou marcado como falta a partir de terça-feira, 3 de novembro de 2026, às 10:00.",
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Concluir atendimento" }),
    ).not.toBeInTheDocument();
  });

  it("no instante exato do início já oferece a conclusão", () => {
    renderClosing({}, new Date("2026-11-03T13:00:00Z"));

    expect(
      screen.getByRole("button", { name: "Concluir atendimento" }),
    ).toBeInTheDocument();
  });

  it("o concluído mostra o pagamento, quem concluiu e o Corrigir (RN-33, RN-41)", () => {
    renderClosing(
      {
        status: "COMPLETED",
        payment: { amount: "30.00", method: "CREDIT" },
        closed_at: "2026-11-03T10:50:00-03:00",
        closed_by: "dono@barbearia.example.com",
      },
      after,
    );

    expect(
      screen.getByRole("heading", { name: "Pagamento" }),
    ).toBeInTheDocument();
    expect(screen.getByText("R$ 30,00")).toBeInTheDocument();
    expect(screen.getByText("Forma").nextElementSibling).toHaveTextContent(
      "Crédito",
    );
    expect(
      screen.getByText(
        "por dono@barbearia.example.com em terça-feira, 3 de novembro de 2026, às 10:50",
      ),
    ).toBeInTheDocument();
    expect(screen.getByText("Corrigir")).toBeInTheDocument();
    // O formulário de correção já vem com o valor e a forma atuais.
    expect(screen.getByLabelText("Valor cobrado (R$)")).toHaveValue("30,00");
    expect(screen.getByRole("radio", { name: "Crédito" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Pix" })).not.toBeChecked();
    expect(
      screen.getByRole("button", { name: "Salvar correção" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Concluir atendimento" }),
    ).not.toBeInTheDocument();
  });

  it("a cortesia mostra R$ 0,00", () => {
    renderClosing(
      {
        status: "COMPLETED",
        payment: { amount: "0.00", method: "CASH" },
        closed_at: "2026-11-03T10:50:00-03:00",
        closed_by: "dono@barbearia.example.com",
      },
      after,
    );

    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
    expect(screen.getByLabelText("Valor cobrado (R$)")).toHaveValue("0,00");
  });

  it("a falta mostra quem registrou e não oferece ações (RN-33)", () => {
    renderClosing(
      {
        status: "NO_SHOW",
        closed_at: "2026-11-03T10:50:00-03:00",
        closed_by: "dono@barbearia.example.com",
      },
      after,
    );

    expect(
      screen.getByText(
        "Falta registrada por dono@barbearia.example.com em terça-feira, 3 de novembro de 2026, às 10:50.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("o cancelado não mostra nada", () => {
    renderClosing(
      {
        status: "CANCELED",
        canceled_at: "2026-11-02T18:30:00-03:00",
        canceled_by: "CUSTOMER",
      },
      after,
    );

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });
});

describe("estado do fechamento", () => {
  it("só aceita avisos conhecidos", () => {
    expect(noticeMessage("concluido")).toBe("Atendimento concluído.");
    expect(noticeMessage("faltou")).toBe("Falta registrada.");
    expect(noticeMessage("corrigido")).toBe("Pagamento corrigido.");
    expect(noticeMessage("<b>oi</b>")).toBeUndefined();
    expect(noticeMessage("toString")).toBeUndefined();
    expect(noticeMessage(["concluido"])).toBeUndefined();
    expect(noticeMessage(undefined)).toBeUndefined();
  });

  it("o aviso volta ao detalhe da mesma agenda", () => {
    expect(
      noticeHref(
        7,
        { data: "2026-11-05", visao: "semana", barbeiro: 2 },
        "faltou",
      ),
    ).toBe(
      "/admin/agenda/7?data=2026-11-05&visao=semana&barbeiro=2&aviso=faltou",
    );
  });

  it("compara o início com o relógio", () => {
    expect(hasNotStarted("2026-11-03T10:00:00-03:00", before)).toBe(true);
    expect(
      hasNotStarted(
        "2026-11-03T10:00:00-03:00",
        new Date("2026-11-03T13:00:00Z"),
      ),
    ).toBe(false);
  });
});
