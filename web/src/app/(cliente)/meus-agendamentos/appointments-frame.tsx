import type { ReactNode } from "react";
import { BookingMain } from "@/components/booking/booking-frame";

/** Moldura da lista, compartilhada com o carregamento. */
export function MyAppointmentsFrame({
  children,
  busy = false,
}: {
  children: ReactNode;
  busy?: boolean;
}) {
  return (
    <BookingMain busy={busy}>
      <h1 className="font-heading text-display-3 font-normal text-ink">
        Meus agendamentos
      </h1>
      <p className="mt-4 text-body text-ink-muted">
        Você pode remarcar ou cancelar até o horário marcado. Se puder, avise
        com pelo menos 2 horas de antecedência.
      </p>
      <div className="mt-10">{children}</div>
    </BookingMain>
  );
}
