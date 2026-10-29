import { Suspense, type CSSProperties } from "react";
import { ApiStatus, ApiStatusBar } from "@/components/api-status";
import { ButtonLink } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { SectionHeading } from "@/components/ui/section-heading";

const upcoming = [
  {
    title: "Agendamento online",
    text: "Escolha o serviço, o barbeiro e um horário livre, direto pelo celular.",
  },
  {
    title: "Lembrete por e-mail",
    text: "Você recebe a confirmação na hora e um lembrete na véspera do atendimento.",
  },
  {
    title: "Remarque quando precisar",
    text: "Mudou de planos? Remarque ou cancele pelo site até 2 horas antes.",
  },
];

export default function HomePage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <section className="bg-ink px-4 py-24 text-center sm:px-6 lg:py-36">
        <div className="mx-auto max-w-3xl">
          <div className="motion-safe:animate-rise">
            <Ornament tone="dark" />
          </div>
          <h1 className="mt-6 font-heading text-display-1 font-bold text-surface motion-safe:animate-rise motion-safe:[animation-delay:80ms]">
            Em construção
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-on-ink-muted sm:text-lg motion-safe:animate-rise motion-safe:[animation-delay:160ms]">
            Estamos preparando o novo site da Augusto Barbearia. Em breve você
            vai poder agendar seu horário por aqui.
          </p>
          <div className="mt-10 motion-safe:animate-rise motion-safe:[animation-delay:240ms]">
            <ButtonLink
              href="#novidades"
              variant="outline-light"
              className="w-full sm:w-auto"
            >
              Veja o que vem por aí
            </ButtonLink>
          </div>
        </div>
      </section>

      <section
        id="novidades"
        className="scroll-mt-20 px-4 py-20 sm:px-6 lg:px-8 lg:py-32"
      >
        <div className="mx-auto max-w-7xl">
          <div data-reveal>
            <SectionHeading
              title="O que vem por aí"
              description="Tudo o que você precisa para cuidar do visual sem precisar ligar ou mandar mensagem."
            />
          </div>
          <ul className="mt-12 grid gap-6 md:grid-cols-3 lg:mt-16">
            {upcoming.map(({ title, text }, index) => (
              <li
                key={title}
                data-reveal
                style={
                  { "--reveal-delay": `${index * 100}ms` } as CSSProperties
                }
                className="bg-surface p-8 shadow-card lg:p-10"
              >
                <p
                  aria-hidden="true"
                  className="font-heading text-display-3 font-bold text-brand"
                >
                  {String(index + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-4 font-heading text-xl font-bold text-ink">
                  {title}
                </h3>
                <p className="mt-3 leading-relaxed text-ink-muted">{text}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {process.env.NODE_ENV === "development" && (
        <Suspense
          fallback={<ApiStatusBar tone="pending" label="verificando…" />}
        >
          <ApiStatus />
        </Suspense>
      )}
    </main>
  );
}
