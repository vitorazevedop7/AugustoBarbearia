import { BookingMain } from "@/components/booking/booking-frame";

/** Esqueleto da lista e das telas de cancelar e remarcar. */
export default function MyAppointmentsLoading() {
  return (
    <BookingMain busy>
      <p role="status" className="sr-only">
        Carregando seus agendamentos.
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="h-10 w-3/4 bg-line motion-safe:animate-pulse" />
        <div className="h-4 w-full bg-line motion-safe:animate-pulse" />
        {Array.from({ length: 2 }, (_, item) => (
          <div key={item} className="h-48 bg-line motion-safe:animate-pulse" />
        ))}
      </div>
    </BookingMain>
  );
}
