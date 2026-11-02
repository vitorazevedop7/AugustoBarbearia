import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AgendaToolbar } from "./agenda-toolbar";

const barbers = [{ id: 1, name: "Lauro" }];

describe("barra da agenda", () => {
  it("depois de Anterior, Hoje ou Próximo, o campo mostra o dia da agenda, não a data digitada", () => {
    const { rerender } = render(
      <AgendaToolbar
        state={{ data: "2026-11-02", visao: "dia" }}
        today="2026-11-02"
        barbers={barbers}
      />,
    );
    fireEvent.change(screen.getByLabelText("Ir para a data"), {
      target: { value: "2026-11-20" },
    });
    expect(screen.getByLabelText("Ir para a data")).toHaveValue("2026-11-20");

    // "Próximo" navega no cliente: a página volta com o dia seguinte.
    rerender(
      <AgendaToolbar
        state={{ data: "2026-11-03", visao: "dia" }}
        today="2026-11-02"
        barbers={barbers}
      />,
    );

    expect(screen.getByLabelText("Ir para a data")).toHaveValue("2026-11-03");
  });
});
