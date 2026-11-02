import { FramedPhoto } from "@/components/ui/framed-photo";
import { SectionHeading } from "@/components/ui/section-heading";
import { vitrinePhotos } from "@/lib/vitrine-photos";

const STEPS = [
  "Escolha o barbeiro.",
  "Escolha o serviço.",
  "Escolha o dia e o horário.",
  "Confirme com sua conta Google.",
];

/** O fluxo existente (D11), com as condições das RN-14 e RN-51. */
export function HowItWorks() {
  return (
    <section
      aria-labelledby="como-funciona-titulo"
      className="overflow-hidden bg-surface px-4 py-section sm:px-6 lg:px-8"
    >
      <div className="mx-auto grid max-w-site items-center gap-12 lg:grid-cols-2 lg:gap-32">
        <div className="relative min-w-0 md:pb-[25%] md:pl-8 lg:order-2 lg:-mr-[max(2rem,calc((100vw-var(--container-site))/2))] lg:pl-0">
          <FramedPhoto
            photo={vitrinePhotos.howChair}
            ratioClassName="aspect-[7/8]"
            sizes="(min-width: 1024px) calc((100vw - 8rem) / 2), (min-width: 768px) calc(100vw - 5rem), (min-width: 640px) calc(100vw - 3rem), calc(100vw - 2rem)"
            data-reveal="zoom"
          />
          <div className="absolute bottom-0 left-0 hidden w-[70%] border-8 border-surface md:block lg:-left-16">
            <FramedPhoto
              photo={vitrinePhotos.howPhone}
              ratioClassName="aspect-[7/8]"
              sizes="(min-width: 1024px) 35vw, 70vw"
              data-reveal="zoom"
            />
          </div>
        </div>

        <div data-reveal="rise" className="min-w-0 lg:order-1">
          <SectionHeading
            id="como-funciona-titulo"
            title="Como funciona"
            align="start"
          />
          <ol className="mt-8 list-decimal space-y-4 pl-7 text-body marker:font-heading marker:font-black marker:text-brand">
            {STEPS.map((step) => (
              <li key={step} className="pl-2">
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-8 space-y-4 text-body text-ink-muted">
            <p>
              Receba um lembrete por e-mail cerca de um dia antes, para reservas
              feitas com pelo menos 24 horas de antecedência.
            </p>
            <p>Cancele ou remarque pelo site até 2 horas antes do horário.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
