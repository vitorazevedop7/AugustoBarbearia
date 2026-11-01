import Link from "next/link";
import type { AvailableSlot } from "@/lib/api/public";
import { formatTime } from "@/lib/format";
import { optionClasses } from "./option";

/**
 * Escolha do horário: os horários livres do dia que a API devolveu (RN-05),
 * em Manhã e Tarde, 3 por linha no celular. Cada horário é um link: um toque
 * avança, sem JS. `hrefFor` diz para onde cada horário leva, para a
 * remarcação (S3.09) poder reaproveitar a mesma tela.
 */
export function TimePicker({
  slots,
  hrefFor,
  headingLevel: Heading = "h2",
}: {
  slots: AvailableSlot[];
  hrefFor: (slot: AvailableSlot) => string;
  /** `h3` quando a tela já tem um `h2` acima (ex.: /design-system). */
  headingLevel?: "h2" | "h3";
}) {
  const groups = [
    { id: "manha", title: "Manhã", slots: [] as AvailableSlot[] },
    { id: "tarde", title: "Tarde", slots: [] as AvailableSlot[] },
  ];
  for (const slot of slots) {
    // Só agrupa para a leitura: antes do meio-dia é manhã.
    groups[formatTime(slot.starts_at) < "12:00" ? 0 : 1].slots.push(slot);
  }

  return (
    <div className="flex flex-col gap-8">
      {groups
        .filter((group) => group.slots.length > 0)
        .map((group) => (
          <section key={group.id} aria-labelledby={`periodo-${group.id}`}>
            <Heading
              id={`periodo-${group.id}`}
              className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase"
            >
              {group.title}
            </Heading>
            <ul className="mt-3 grid grid-cols-3 gap-3 sm:grid-cols-6">
              {group.slots.map((slot) => (
                <li key={slot.starts_at}>
                  <Link
                    href={hrefFor(slot)}
                    className={`${optionClasses} font-heading text-lg font-semibold`}
                  >
                    {formatTime(slot.starts_at)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
    </div>
  );
}
