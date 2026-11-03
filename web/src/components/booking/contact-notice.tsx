import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { contactLinks, type ShopContact } from "@/lib/contact";

const textLink =
  "font-semibold text-brand underline underline-offset-4 transition-colors duration-300 ease-standard hover:text-brand-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand motion-reduce:transition-none";

export const DEADLINE_TITLE =
  "Seu horário já começou. Se você está a caminho ou não vai conseguir vir, fale com a barbearia.";

/**
 * Aviso com os contatos que a administração preencheu (RN-14): depois do
 * início, quando o cliente já não altera o agendamento pelo site (o título
 * repete o `message` da API), e nas últimas 2 horas, quando ainda altera mas
 * talvez só vá se atrasar. Quem decide o momento é a API (`can_cancel`,
 * `late_change`). Sem contato preenchido, o aviso não aponta para um contato
 * que não existe.
 */
export function ContactNotice({
  shop,
  title = DEADLINE_TITLE,
  revealOnMount,
  children,
}: {
  /** `null` quando a vitrine não respondeu: o aviso aparece sem os links. */
  shop: ShopContact | null;
  title?: string;
  /** Como o `Alert`: depois de uma ação recusada, o aviso recebe o foco. */
  revealOnMount?: "center" | "top";
  /** O texto antes dos contatos. */
  children?: ReactNode;
}) {
  const links = shop ? contactLinks(shop) : [];
  return (
    <Alert tone="warning" title={title} revealOnMount={revealOnMount}>
      {children ? <p>{children}</p> : null}
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
      ) : null}
    </Alert>
  );
}
