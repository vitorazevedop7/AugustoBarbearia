import { buttonClasses } from "@/components/ui/button";
import { calendarHref } from "@/app/(cliente)/meus-agendamentos/appointments-state";

/**
 * "Adicionar ao calendário": baixa o `.ics` do agendamento ativo (RN-31). É um
 * `<a download>` e não um `Link`: o destino é um arquivo, e o `Link`
 * pré-carregaria o `.ics` só por aparecer na tela.
 */
export function CalendarLink({
  appointmentId,
  label,
  size = "sm",
  className = "",
}: {
  appointmentId: number;
  /** Para leitores de tela, quando há mais de um cartão na página. */
  label?: string;
  size?: "md" | "sm";
  className?: string;
}) {
  return (
    <a
      href={calendarHref(appointmentId)}
      download
      className={`${buttonClasses({ variant: "outline", size })} ${className}`}
    >
      Adicionar ao calendário
      {label ? <span className="sr-only"> {label}</span> : null}
    </a>
  );
}
