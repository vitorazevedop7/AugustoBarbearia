import type { components } from "@/lib/api/schema";

type Appointment = components["schemas"]["CustomerAppointmentResponse"];

/** Um agendamento do cliente no formato de `GET /me/appointments`. */
export function appointment(changes: Partial<Appointment> = {}): Appointment {
  return {
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
    change_deadline: "2026-11-03T10:00:00-03:00",
    can_cancel: true,
    can_reschedule: true,
    late_change: false,
    ...changes,
  };
}

/** O mesmo agendamento depois do início: o cliente já não altera (RN-14). */
export function startedAppointment(changes: Partial<Appointment> = {}) {
  return appointment({ can_cancel: false, can_reschedule: false, ...changes });
}

/** Nas 2 horas antes do início: ainda altera, com o aviso (RN-14). */
export function lateChangeAppointment(changes: Partial<Appointment> = {}) {
  return appointment({ late_change: true, ...changes });
}
