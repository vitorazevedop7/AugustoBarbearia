import { Alert } from "@/components/ui/alert";
import { contactLinks, type ShopContact } from "@/lib/contact";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-out hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

export const DEADLINE_TITLE =
  "Faltam menos de 2 horas para o seu horário. Para cancelar ou remarcar, fale com a barbearia.";

/**
 * Aviso de que o cliente já não altera o agendamento pelo site (RN-14), com
 * os contatos que a administração preencheu. O título repete o `message` da
 * API, e quem decide o prazo é ela (`can_cancel`, `can_reschedule`).
 */
export function ContactNotice({
  shop,
  title = DEADLINE_TITLE,
}: {
  /** `null` quando a vitrine não respondeu: o aviso aparece sem os links. */
  shop: ShopContact | null;
  title?: string;
}) {
  const links = shop ? contactLinks(shop) : [];
  return (
    <Alert tone="warning" title={title}>
      {links.length > 0 ? (
        <ul className="mt-1 flex flex-col gap-1">
          {links.map(({ label, text, href }) => (
            <li key={label}>
              {label}:{" "}
              <a
                href={href}
                className={`${textLink} inline-flex min-h-11 items-center break-all`}
              >
                {text}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p>Use os contatos do rodapé do site.</p>
      )}
    </Alert>
  );
}
