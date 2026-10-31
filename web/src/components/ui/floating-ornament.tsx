/** Dentes do pente: grossos à esquerda e finos à direita, como um pente de barbeiro. */
const combTeeth = [
  ...Array.from({ length: 10 }, (_, i) => 18 + i * 10),
  ...Array.from({ length: 17 }, (_, i) => 120 + i * 6),
]
  .map((x) => `M${x} 30V${x < 120 ? 74 : 66}`)
  .join("");

/** Desenhos de traço próprios (S4.06, #79), num `viewBox` cada. */
const shapes = {
  /** Navalha aberta: cabo à esquerda, pino e lâmina à direita. */
  razor: {
    viewBox: "0 0 240 100",
    d: "M106 44C80 50 48 58 22 62q-10 2-9 9t11 5c26-4 58-14 84-22M112 40l102-8q16-1 16 14v12q0 8-8 8H126q-12 0-16-10M124 45l98-7M112 40q-12-2-15-10t4-9",
    extra: <circle cx="111" cy="49" r="4" />,
  },
  /** Tesoura aberta, de pé: lâminas cruzadas no pino e as argolas embaixo. */
  scissors: {
    viewBox: "0 0 160 200",
    d: "M66 134 120 12q5-6 6 2L90 114M94 134 40 12q-5-6-6 2l36 100",
    extra: (
      <>
        <circle cx="80" cy="102" r="4" />
        <circle cx="54" cy="156" r="20" />
        <circle cx="106" cy="156" r="20" />
      </>
    ),
  },
  /** Pente de barbeiro: dentes grossos de um lado e finos do outro. */
  comb: {
    viewBox: "0 0 240 100",
    d: `M10 12h220v18H10zM10 30v6M230 30v6${combTeeth}`,
    extra: null,
  },
} as const;

/**
 * Ornamento grande que flutua na borda de uma seção da vitrine, atrás do
 * conteúdo, como os do Beard X, mas com desenho próprio: só traço, em
 * `currentColor` e com poucos bytes. É decoração (`aria-hidden`, sem
 * ponteiro) e entra com `fade` ao rolar.
 *
 * A seção precisa de `relative isolate overflow-hidden`: o `isolate` deixa o
 * `-z-10` atrás do conteúdo e na frente do fundo da seção, e o
 * `overflow-hidden` recorta o que passa da borda, sem rolagem horizontal. A
 * posição e o tamanho vêm por `className` (sem `transform`, que a entrada ao
 * rolar usa). Abaixo do `lg`, ele some: no celular e no tablet, o texto ocupa a
 * largura toda e não sobra borda para decorar.
 */
export function FloatingOrnament({
  shape,
  className = "",
}: {
  shape: keyof typeof shapes;
  className?: string;
}) {
  const { viewBox, d, extra } = shapes[shape];
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      data-reveal="fade"
      viewBox={viewBox}
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`pointer-events-none absolute -z-10 hidden text-ink/10 lg:block ${className}`}
    >
      <path d={d} />
      {extra}
    </svg>
  );
}
