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
      <h1 className="font-heading text-display-3 font-black uppercase text-ink">
        Meus agendamentos
      </h1>
      <p className="mt-3 text-ink-muted">
        Você pode cancelar ou remarcar até 2 horas antes do horário. Depois
        disso, fale com a barbearia.
      </p>
      <div className="mt-8">{children}</div>
    </BookingMain>
  );
}
