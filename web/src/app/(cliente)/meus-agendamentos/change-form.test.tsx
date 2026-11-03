import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { shop } from "@/test/vitrine-data";
import { ChangeForm } from "./change-form";

function renderForm(
  action: () => Promise<{ status: "error"; message: string; code?: string }>,
) {
  render(
    <ChangeForm
      action={action}
      fields={{ appointment_id: 7 }}
      shop={{ ...shop, instagram: "augustobarbearia" }}
      submitLabel="Confirmar remarcação"
      secondary={<a href="/meus-agendamentos">Voltar</a>}
      retry={{ href: "/remarcar?hora", label: "Escolher outro horário" }}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Confirmar remarcação" }));
}

describe("ChangeForm", () => {
  it("mostra o message da API com o link para outro horário", async () => {
    renderForm(
      vi.fn().mockResolvedValue({
        status: "error",
        code: "SLOT_UNAVAILABLE",
        message: "Este horário não está mais disponível. Escolha outro.",
      }),
    );

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Este horário não está mais disponível. Escolha outro.",
    );
    expect(
      screen.getByRole("link", { name: "Escolher outro horário" }),
    ).toHaveAttribute("href", "/remarcar?hora");
  });

  it("prazo vencido mostra o contato da barbearia (RN-14)", async () => {
    renderForm(
      vi.fn().mockResolvedValue({
        status: "error",
        code: "CHANGE_DEADLINE_PASSED",
        message:
          "Seu horário já começou. Se você está a caminho ou não vai conseguir vir, fale com a barbearia.",
      }),
    );

    expect(
      await screen.findByRole("link", { name: "@augustobarbearia" }),
    ).toHaveAttribute("href", "https://www.instagram.com/augustobarbearia/");
    expect(screen.queryByRole("alert")).toBeNull();
  });
});
