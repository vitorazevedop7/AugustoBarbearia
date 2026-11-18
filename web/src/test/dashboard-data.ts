import type { components } from "@/lib/api/schema";

type Dashboard = components["schemas"]["Dashboard"];

/** Os 30 dias até 18/11/2026, com faturamento em 10/11 e hoje. */
function dailyRevenue(): Dashboard["daily_revenue"] {
  const days: Dashboard["daily_revenue"] = [];
  const first = Date.UTC(2026, 9, 20);
  for (let offset = 0; offset < 30; offset += 1) {
    const date = new Date(first + offset * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const revenue =
      date === "2026-11-10"
        ? "75.00"
        : date === "2026-11-18"
          ? "35.00"
          : "0.00";
    days.push({
      date,
      revenue,
      completed_count: revenue === "0.00" ? 0 : revenue === "75.00" ? 2 : 1,
    });
  }
  return days;
}

const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17, 18];

function counts(values: Record<number, number> = {}): number[] {
  return hours.map((hour) => values[hour] ?? 0);
}

/** O painel de quarta, 18/11/2026, 15h em São Paulo, no formato de `GET /admin/dashboard`. */
export function filledDashboard(changes: Partial<Dashboard> = {}): Dashboard {
  return {
    generated_at: "2026-11-18T15:00:00-03:00",
    current: {
      start: "2026-11-01",
      end: "2026-11-18",
      revenue: "60.50",
      completed_count: 2,
      no_show_count: 1,
      no_show_rate: "33.3",
      average_ticket: "30.25",
    },
    previous: {
      start: "2026-10-01",
      end: "2026-10-18",
      revenue: "50.00",
      completed_count: 2,
      no_show_count: 0,
      no_show_rate: "0.0",
      average_ticket: "25.00",
    },
    changes: {
      revenue: "21.0",
      completed_count: "0.0",
      average_ticket: "-5.5",
      no_show_rate: "33.3",
    },
    daily_revenue: dailyRevenue(),
    occupancy: [
      {
        barber_id: 1,
        barber_name: "Edvaldo",
        past: {
          start: "2026-11-11",
          end: "2026-11-17",
          booked_minutes: 1500,
          available_minutes: 3000,
          rate: "50.0",
        },
        upcoming: {
          start: "2026-11-18",
          end: "2026-11-24",
          booked_minutes: 75,
          available_minutes: 2700,
          rate: "2.8",
        },
      },
      {
        barber_id: 2,
        barber_name: "Lauro",
        past: {
          start: "2026-11-11",
          end: "2026-11-17",
          booked_minutes: 0,
          available_minutes: 3000,
          rate: "0.0",
        },
        upcoming: {
          start: "2026-11-18",
          end: "2026-11-24",
          booked_minutes: 0,
          available_minutes: 0,
          rate: null,
        },
      },
    ],
    peak_hours: {
      start: "2026-08-20",
      end: "2026-11-17",
      hours,
      rows: [
        { weekday: 0, open: true, counts: counts() },
        { weekday: 1, open: true, counts: counts({ 10: 4, 11: 1 }) },
        { weekday: 2, open: true, counts: counts({ 15: 2 }) },
        { weekday: 3, open: true, counts: counts() },
        { weekday: 4, open: true, counts: counts({ 18: 3 }) },
        { weekday: 5, open: true, counts: counts({ 9: 1 }) },
        { weekday: 6, open: false, counts: counts() },
      ],
      max_count: 4,
    },
    today: {
      date: "2026-11-18",
      total_count: 4,
      completed_count: 1,
      upcoming: [
        {
          id: 21,
          starts_at: "2026-11-18T14:30:00-03:00",
          ends_at: "2026-11-18T15:15:00-03:00",
          customer_name: "Ana Souza",
          barber_name: "Edvaldo",
          service_name: "Corte + Barba",
          in_progress: true,
        },
        {
          id: 22,
          starts_at: "2026-11-18T16:00:00-03:00",
          ends_at: "2026-11-18T16:30:00-03:00",
          customer_name: "Bruno Lima",
          barber_name: "Lauro",
          service_name: "Corte Simples",
          in_progress: false,
        },
      ],
    },
    ...changes,
  };
}

/** Um painel sem nenhum atendimento: nada a comparar, gráfico e mapa vazios. */
export function emptyDashboard(): Dashboard {
  const filled = filledDashboard();
  return filledDashboard({
    current: {
      ...filled.current,
      revenue: "0.00",
      completed_count: 0,
      no_show_count: 0,
      no_show_rate: null,
      average_ticket: null,
    },
    previous: {
      ...filled.previous,
      revenue: "0.00",
      completed_count: 0,
      no_show_count: 0,
      no_show_rate: null,
      average_ticket: null,
    },
    changes: {
      revenue: null,
      completed_count: null,
      average_ticket: null,
      no_show_rate: null,
    },
    daily_revenue: filled.daily_revenue.map((day) => ({
      ...day,
      revenue: "0.00",
      completed_count: 0,
    })),
    peak_hours: {
      ...filled.peak_hours,
      rows: filled.peak_hours.rows.map((row) => ({
        ...row,
        counts: counts(),
      })),
      max_count: 0,
    },
    today: {
      date: "2026-11-18",
      total_count: 0,
      completed_count: 0,
      upcoming: [],
    },
  });
}
