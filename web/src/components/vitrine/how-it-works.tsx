import { SectionHeading } from "@/components/ui/section-heading";

const STEPS = [
  "Escolha o barbeiro.",
  "Escolha o serviço.",
  "Escolha o dia e o horário.",
  "Confirme com sua conta Google.",
];

/**
 * O fluxo existente (D11), com as condições das RN-14 e RN-51: os quatro
 * passos lado a lado numa `ol` de verdade (o numeral é o contador da lista),
 * e as duas condições abaixo de um filete.
 */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="como-funciona-titulo"
      className="bg-paper-2 px-4 py-section-l sm:px-6 lg:px-8"
    >
      <div className="mx-auto max-w-site" data-reveal="rise">
        <SectionHeading id="como-funciona-titulo" title="Como funciona" />
        <ol className="steps mt-12 grid gap-10 sm:grid-cols-[repeat(2,minmax(0,1fr))] lg:mt-16 lg:grid-cols-[repeat(4,minmax(0,1fr))] lg:gap-8">
          {STEPS.map((step) => (
            <li
              key={step}
              className="border-t border-ink pt-6 font-heading text-display-4 font-normal text-ink"
            >
              {step}
            </li>
          ))}
        </ol>
        <div className="mt-14 grid gap-6 border-t border-line pt-8 text-body text-ink-muted md:grid-cols-[repeat(2,minmax(0,1fr))] md:gap-8 lg:mt-20">
          <p className="max-w-xl">
            Receba um lembrete por e-mail cerca de um dia antes, para reservas
            feitas com pelo menos 24 horas de antecedência.
          </p>
          <p className="max-w-xl">
            Remarque ou cancele pelo site até o horário. Avisando com 2 horas de
            antecedência, outro cliente aproveita a vaga.
          </p>
        </div>
      </div>
    </section>
  );
}
