import { BookingMain } from "./booking-frame";

export default function BookingLoading() {
  return (
    <BookingMain busy>
      <p role="status" className="sr-only">
        Carregando o agendamento.
      </p>
      <div aria-hidden="true" className="flex flex-col gap-6">
        <div className="h-4 w-40 bg-line motion-safe:animate-pulse" />
        <div className="h-10 w-3/4 bg-line motion-safe:animate-pulse" />
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {Array.from({ length: 9 }, (_, item) => (
            <div
              key={item}
              className="h-14 bg-line motion-safe:animate-pulse"
            />
          ))}
        </div>
      </div>
    </BookingMain>
  );
}
