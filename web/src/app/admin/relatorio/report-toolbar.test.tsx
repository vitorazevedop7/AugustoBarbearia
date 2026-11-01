import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportToolbar } from "./report-toolbar";

const barbers = [{ id: 1, name: "Lauro" }];

describe("barra do relatório — RN-43", () => {
  it("depois de um atalho, o formulário mostra o período do relatório, não a data digitada", () => {
    const { rerender } = render(
      <ReportToolbar
        state={{ inicio: "2026-11-01", fim: "2026-11-30" }}
        today="2026-11-03"
        barbers={barbers}
      />,
    );
    fireEvent.change(screen.getByLabelText("De"), {
      target: { value: "2026-10-15" },
    });
    expect(screen.getByLabelText("De")).toHaveValue("2026-10-15");

    // O atalho "Hoje" navega no cliente: a página volta com o estado novo.
    rerender(
      <ReportToolbar
        state={{ inicio: "2026-11-03", fim: "2026-11-03" }}
        today="2026-11-03"
        barbers={barbers}
      />,
    );

    expect(screen.getByLabelText("De")).toHaveValue("2026-11-03");
    expect(screen.getByLabelText("Até")).toHaveValue("2026-11-03");
  });
});
