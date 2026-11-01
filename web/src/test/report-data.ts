import type { components } from "@/lib/api/schema";

type Report = components["schemas"]["FinancialReport"];
type Item = components["schemas"]["CompletedAppointment"];

/** Um atendimento concluído no formato de `GET /admin/reports/financial`. */
export function completedItem(changes: Partial<Item> = {}): Item {
  return {
    appointment_id: 7,
    starts_at: "2026-11-03T10:00:00-03:00",
    customer: { id: 3, name: "Ana Souza" },
    barber: { id: 1, name: "Edvaldo" },
    service: { id: 2, name: "Corte + Barba" },
    amount: "35.00",
    method: "PIX",
    ...changes,
  };
}

const emptyMethods: Report["by_method"] = [
  { method: "CASH", total: "0.00", count: 0 },
  { method: "PIX", total: "0.00", count: 0 },
  { method: "DEBIT", total: "0.00", count: 0 },
  { method: "CREDIT", total: "0.00", count: 0 },
];

/** O mês de novembro de 2026 sem nenhum atendimento. */
export function emptyReport(changes: Partial<Report> = {}): Report {
  return {
    start: "2026-11-01",
    end: "2026-11-30",
    barber_id: null,
    total: "0.00",
    completed_count: 0,
    no_show_count: 0,
    by_barber: [
      {
        barber: { id: 1, name: "Edvaldo", active: true },
        total: "0.00",
        completed_count: 0,
        no_show_count: 0,
      },
    ],
    by_method: emptyMethods,
    completed: [],
    ...changes,
  };
}

/** Dois concluídos (Pix e dinheiro) e uma falta. */
export function filledReport(): Report {
  return emptyReport({
    total: "60.50",
    completed_count: 2,
    no_show_count: 1,
    by_barber: [
      {
        barber: { id: 1, name: "Edvaldo", active: true },
        total: "35.00",
        completed_count: 1,
        no_show_count: 1,
      },
      {
        barber: { id: 4, name: "Zeca", active: false },
        total: "25.50",
        completed_count: 1,
        no_show_count: 0,
      },
    ],
    by_method: [
      { method: "CASH", total: "25.50", count: 1 },
      { method: "PIX", total: "35.00", count: 1 },
      { method: "DEBIT", total: "0.00", count: 0 },
      { method: "CREDIT", total: "0.00", count: 0 },
    ],
    completed: [
      completedItem(),
      completedItem({
        appointment_id: 9,
        starts_at: "2026-11-04T22:00:00-03:00",
        customer: { id: 5, name: "Bruno Lima" },
        barber: { id: 4, name: "Zeca" },
        service: { id: 1, name: "Corte Simples" },
        amount: "25.50",
        method: "CASH",
      }),
    ],
  });
}
