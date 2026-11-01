import type { components } from "@/lib/api/schema";

type Appointment = components["schemas"]["AdminAppointmentResponse"];
type Agenda = components["schemas"]["AgendaResponse"];

/** Um agendamento no formato de `GET /admin/appointments`. */
export function adminAppointment(
  changes: Partial<Appointment> = {},
): Appointment {
  return {
    id: 7,
    status: "SCHEDULED",
    source: "ONLINE",
    customer: {
      id: 3,
      name: "Ana Souza",
      phone: "11987654321",
      email: "ana@example.com",
    },
    barber: { id: 1, name: "Edvaldo", active: true },
    service: { id: 2, name: "Corte + Barba" },
    starts_at: "2026-11-03T10:00:00-03:00",
    ends_at: "2026-11-03T10:45:00-03:00",
    price: "35.00",
    duration_minutes: 45,
    canceled_at: null,
    canceled_by: null,
    ...changes,
  };
}

export const agendaBarbers = [
  { id: 1, name: "Edvaldo", active: true },
  { id: 2, name: "Lauro", active: true },
  { id: 3, name: "Manoel", active: true },
];

const weekday = { opens_at: "10:00:00", closes_at: "19:00:00" };

/** A agenda de terça, 3/11/2026, no formato de `GET /admin/appointments`. */
export function agendaDay(changes: Partial<Agenda> = {}): Agenda {
  return {
    start: "2026-11-03",
    end: "2026-11-03",
    days: [{ date: "2026-11-03", ...weekday }],
    barbers: agendaBarbers,
    appointments: [],
    ...changes,
  };
}

/** A semana de 2 a 8/11/2026, com sábado curto e domingo fechado. */
export function agendaWeek(changes: Partial<Agenda> = {}): Agenda {
  const dates = ["02", "03", "04", "05", "06"].map((day) => ({
    date: `2026-11-${day}`,
    ...weekday,
  }));
  return {
    start: "2026-11-02",
    end: "2026-11-08",
    days: [
      ...dates,
      { date: "2026-11-07", opens_at: "09:00:00", closes_at: "14:00:00" },
      { date: "2026-11-08", opens_at: null, closes_at: null },
    ],
    barbers: agendaBarbers,
    appointments: [],
    ...changes,
  };
}
