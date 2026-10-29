import type { Metadata } from "next";
import type { ReactNode } from "react";
import { ContactNotice } from "@/components/booking/contact-notice";
import { DayPicker } from "@/components/booking/day-picker";
import { TimePicker } from "@/components/booking/time-picker";
import { Alert } from "@/components/ui/alert";
import { Badge, StatusBadge } from "@/components/ui/badge";
import { BarberCard } from "@/components/ui/barber-card";
import { Button, ButtonLink } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ChoiceChip } from "@/components/ui/choice-chip";
import { EmptyState } from "@/components/ui/empty-state";
import { SelectField, TextAreaField, TextField } from "@/components/ui/field";
import { Ornament } from "@/components/ui/ornament";
import { SectionHeading } from "@/components/ui/section-heading";
import { ServiceCard } from "@/components/ui/service-card";

/** Vitrine viva do design system (docs/design/design-system.md). Fora da navegação e dos buscadores. */
export const metadata: Metadata = {
  title: "Design system — Augusto Barbearia",
  robots: { index: false, follow: false },
};

const colors = [
  { token: "brand", swatch: "bg-brand", use: "Ação principal, links" },
  {
    token: "brand-strong",
    swatch: "bg-brand-strong",
    use: "Hover do primário",
  },
  {
    token: "brand-on-dark",
    swatch: "bg-brand-on-dark",
    use: "Destaque sobre o escuro",
  },
  { token: "ink", swatch: "bg-ink", use: "Texto; faixas escuras" },
  {
    token: "ink-muted",
    swatch: "bg-ink-muted",
    use: "Texto secundário; bordas de campo",
  },
  {
    token: "on-ink-muted",
    swatch: "bg-on-ink-muted",
    use: "Texto secundário no escuro",
  },
  { token: "line-on-ink", swatch: "bg-line-on-ink", use: "Divisor no escuro" },
  { token: "paper", swatch: "bg-paper", use: "Fundo das páginas" },
  { token: "surface", swatch: "bg-surface", use: "Cards, campos, modais" },
  { token: "line", swatch: "bg-line", use: "Divisores decorativos" },
  { token: "success", swatch: "bg-success", use: "Concluído, confirmação" },
  { token: "warning", swatch: "bg-warning", use: "Aviso (menos de 2h)" },
  {
    token: "danger",
    swatch: "bg-danger",
    use: "Erro, faltou, ação destrutiva",
  },
];

const sections = [
  { id: "cores", title: "Cores" },
  { id: "tipografia", title: "Tipografia" },
  { id: "botoes", title: "Botões" },
  { id: "campos", title: "Campos" },
  { id: "horarios", title: "Chips de horário" },
  { id: "agendamento", title: "Dia e horário" },
  { id: "caixas", title: "Caixas de seleção" },
  { id: "status", title: "Badges" },
  { id: "avisos", title: "Avisos" },
  { id: "titulos", title: "Títulos de seção" },
  { id: "cards", title: "Cards da vitrine" },
  { id: "composicao", title: "Composição" },
];

function Showcase({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-title`}
      className="scroll-mt-20 border-t border-line py-12 lg:py-16"
    >
      <h2
        id={`${id}-title`}
        className="font-heading text-display-3 font-bold text-ink"
      >
        {title}
      </h2>
      <div className="mt-8">{children}</div>
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main id="main-content" tabIndex={-1} className="flex-1">
      <section className="bg-ink px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="mx-auto max-w-7xl">
          <Ornament align="start" tone="dark" />
          <h1 className="mt-6 font-heading text-display-1 font-bold text-surface">
            Design system
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-on-ink-muted sm:text-lg">
            Tokens e componentes da Augusto Barbearia, renderizados com o mesmo
            código das telas. As regras de uso estão em
            docs/design/design-system.md.
          </p>
          <nav aria-label="Seções do design system" className="mt-10">
            <ul className="flex flex-wrap gap-2">
              {sections.map(({ id, title }) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="inline-flex min-h-11 items-center border border-line-on-ink px-4 text-sm text-surface transition-colors duration-300 hover:border-surface focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-surface"
                  >
                    {title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <Showcase id="cores" title="Cores">
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {colors.map(({ token, swatch, use }) => (
              <li key={token} className="bg-surface shadow-card">
                <div className={`h-20 border-b border-line ${swatch}`} />
                <div className="p-3">
                  <p className="font-mono text-sm font-semibold text-ink">
                    {token}
                  </p>
                  <p className="mt-1 text-xs text-ink-muted">{use}</p>
                </div>
              </li>
            ))}
          </ul>
        </Showcase>

        <Showcase id="tipografia" title="Tipografia">
          <div className="space-y-6">
            <p className="font-heading text-display-1 font-bold">
              Display 1 · hero
            </p>
            <p className="font-heading text-display-2 font-bold">
              Display 2 · título de seção
            </p>
            <p className="font-heading text-display-3 font-bold">
              Display 3 · destaque
            </p>
            <p className="font-heading text-xl font-bold">
              Título de card · Playfair 20px
            </p>
            <p className="text-2xl font-semibold">
              Título da área logada · Inter 600
            </p>
            <p className="max-w-2xl text-base leading-relaxed text-ink">
              Corpo · Inter 16px. Frases curtas, tratando o cliente por você:
              escolha o serviço, o barbeiro e o horário que preferir.
            </p>
            <p className="text-sm text-ink-muted">
              Apoio · Inter 14px em ink-muted
            </p>
            <p className="text-xs font-semibold tracking-[0.08em] uppercase">
              Rótulo em caixa alta · Inter 600, 0,08em
            </p>
          </div>
        </Showcase>

        <Showcase id="botoes" title="Botões">
          <div className="flex flex-wrap items-center gap-4">
            <Button>Agendar horário</Button>
            <Button variant="outline">Ver serviços</Button>
            <Button variant="danger">Cancelar agendamento</Button>
            <Button variant="ghost">Voltar</Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <Button size="sm">Remarcar</Button>
            <Button size="sm" variant="outline">
              Editar
            </Button>
            <Button pending>Confirmando</Button>
            <Button disabled>Indisponível</Button>
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-4 bg-ink p-6">
            <ButtonLink href="#botoes" variant="outline-light">
              Sobre o escuro
            </ButtonLink>
            <ButtonLink href="#botoes">Primário no escuro</ButtonLink>
          </div>
        </Showcase>

        <Showcase id="campos" title="Campos">
          <div className="grid max-w-2xl gap-6">
            <TextField
              name="ds-nome"
              label="Nome"
              autoComplete="name"
              defaultValue="Carlos Souza"
            />
            <TextField
              name="ds-telefone"
              label="Celular"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              hint="Com DDD. A barbearia usa só para avisar sobre o seu horário."
              error="Informe um celular com DDD, como (11) 98765-4321."
              defaultValue="98765"
            />
            <TextField
              name="ds-observacao"
              label="Observação"
              optional
              placeholder="Ex.: prefiro máquina 2 nas laterais"
            />
            <TextAreaField
              name="ds-apresentacao"
              label="Apresentação"
              optional
              maxLength={400}
              hint="Até 400 caracteres."
              defaultValue="Barbeiro há 15 anos, especialista em corte clássico e barba na navalha."
            />
            <SelectField
              name="ds-pagamento"
              label="Forma de pagamento"
              defaultValue=""
            >
              <option value="" disabled>
                Escolha uma opção
              </option>
              <option value="CASH">Dinheiro</option>
              <option value="PIX">Pix</option>
              <option value="DEBIT">Débito</option>
              <option value="CREDIT">Crédito</option>
            </SelectField>
            <TextField
              name="ds-email"
              label="E-mail"
              defaultValue="carlos@exemplo.com"
              disabled
              hint="Vem da sua conta Google."
            />
          </div>
        </Showcase>

        <Showcase id="horarios" title="Chips de horário">
          <form className="max-w-xl space-y-8">
            {[
              {
                legend: "Manhã",
                slots: ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30"],
              },
              {
                legend: "Tarde",
                slots: ["14:00", "14:30", "15:00", "16:30", "17:00", "18:30"],
              },
            ].map(({ legend, slots }) => (
              <fieldset key={legend}>
                <legend className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  {legend}
                </legend>
                <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {slots.map((slot) => (
                    <ChoiceChip
                      key={slot}
                      name="ds-hora"
                      value={slot}
                      label={slot}
                      defaultChecked={slot === "10:00"}
                      disabled={slot === "10:30"}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </form>
        </Showcase>

        <Showcase id="agendamento" title="Dia e horário">
          <div className="grid max-w-3xl gap-10">
            <DayPicker
              days={["2026-11-27", "2026-11-28", "2026-11-30", "2026-12-01"]}
              hrefFor={() => "#agendamento"}
              headingLevel="h3"
            />
            <TimePicker
              slots={["09:00", "09:30", "11:30", "14:00", "14:30"].map(
                (time) => ({
                  starts_at: `2026-11-27T${time}:00-03:00`,
                  ends_at: `2026-11-27T${time}:00-03:00`,
                }),
              )}
              hrefFor={() => "#agendamento"}
              headingLevel="h3"
            />
          </div>
        </Showcase>

        <Showcase id="caixas" title="Caixas de seleção">
          <form className="max-w-xl">
            <fieldset className="flex flex-col gap-2">
              <legend className="mb-2 text-sm font-semibold text-ink">
                Quem realiza
              </legend>
              <Checkbox name="ds-barbeiro-1" label="Edvaldo" defaultChecked />
              <Checkbox name="ds-barbeiro-2" label="Lauro" />
              <Checkbox
                name="ds-barbeiro-3"
                label="Manoel (inativo)"
                disabled
              />
            </fieldset>
          </form>
        </Showcase>

        <Showcase id="status" title="Badges">
          <div className="flex flex-wrap gap-3">
            <StatusBadge status="SCHEDULED" />
            <StatusBadge status="COMPLETED" />
            <StatusBadge status="CANCELED" />
            <StatusBadge status="NO_SHOW" />
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            <Badge tone="brand">Novo</Badge>
            <Badge tone="warning">Faltam 2h</Badge>
          </div>
        </Showcase>

        <Showcase id="avisos" title="Avisos">
          <div className="grid max-w-2xl gap-4">
            <Alert title="Seu horário está confirmado.">
              Enviamos os detalhes para o seu e-mail.
            </Alert>
            <Alert tone="success" title="Atendimento concluído." />
            <Alert tone="warning" title="Faltam menos de 2 horas.">
              Pelo site, não dá mais para cancelar ou remarcar. Fale com a
              barbearia.
            </Alert>
            <Alert
              tone="danger"
              title="Esse horário acabou de ser reservado. Escolha outro."
            />
            <ContactNotice
              shop={{ whatsapp: "75999990000", instagram: "augustobarbearia" }}
            />
          </div>
          <div className="mt-8 max-w-2xl">
            <EmptyState
              title="Você ainda não tem horários"
              description="Quando você agendar, seus horários aparecem aqui."
              action={<ButtonLink href="#avisos">Agendar horário</ButtonLink>}
            />
          </div>
        </Showcase>

        <Showcase id="titulos" title="Títulos de seção">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="bg-paper py-10">
              <SectionHeading
                title="Nossos serviços"
                description="Corte, barba e acabamento, com preço e duração."
              />
            </div>
            <div className="bg-ink px-6 py-10">
              <SectionHeading
                tone="dark"
                align="start"
                title="Agende agora"
                description="Escolha o horário pelo celular."
              />
            </div>
          </div>
        </Showcase>

        <Showcase id="cards" title="Cards da vitrine">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            <ServiceCard
              name="Corte + barba"
              description="Descrição opcional do serviço (exemplo)."
              price="70.00"
              durationMinutes={50}
              barbers={["Barbeiro 1", "Barbeiro 2"]}
              href="#cards"
            />
            <BarberCard
              name="Barbeiro 1"
              photoPath={null}
              bio="Sem foto, o card mostra a inicial do nome (exemplo)."
              href="#cards"
              sizes="(min-width: 1024px) 400px, 100vw"
            />
          </div>
          <p className="mt-6 max-w-2xl text-sm text-ink-muted">
            O menu do celular está no cabeçalho desta página: reduza a janela
            para menos de 1024px para vê-lo.
          </p>
        </Showcase>

        <Showcase id="composicao" title="Composição">
          <article
            data-reveal
            className="max-w-md bg-surface p-6 shadow-card sm:p-8"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold tracking-[0.08em] text-ink-muted uppercase">
                  Ter, 3 de nov · 14:30
                </p>
                <h3 className="mt-2 font-heading text-xl font-bold text-ink">
                  Corte + barba
                </h3>
                <p className="mt-1 text-sm text-ink-muted">
                  Com Barbeiro 1 · 50 min · R$ 70,00 (exemplo)
                </p>
              </div>
              <StatusBadge status="SCHEDULED" />
            </div>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Button size="sm" variant="outline">
                Remarcar
              </Button>
              <Button size="sm" variant="danger">
                Cancelar
              </Button>
            </div>
          </article>
        </Showcase>
      </div>
    </main>
  );
}
