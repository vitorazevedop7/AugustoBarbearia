import stepsJson from "../demo-steps.json";

export type Box = { x: number; y: number; w: number; h: number };
export type Captured = { id: string; file: string; box: Box | null; full: boolean; height: number };
const steps = stepsJson as Captured[];
export const cap = (id: string): Captured => {
  const s = steps.find((x) => x.id === id);
  if (!s) throw new Error(`captura ausente: ${id}`);
  return s;
};

export type Item =
  | { kind: "intro"; dur: number }
  | { kind: "outro"; dur: number }
  | { kind: "chapter"; dur: number; n: string; title: string; sub: string }
  | { kind: "click"; dur: number; shot: string; chapter: string; caption: string; ding?: boolean }
  | { kind: "still"; dur: number; shot: string; chapter: string; caption: string; ding?: boolean }
  | { kind: "scroll"; dur: number; shot: string; chapter: string; caption: string; stop?: number }
  | { kind: "mobile"; dur: number };

const CLIENTE = "Cliente";
const ADMIN = "Administração";

export const ITEMS: Item[] = [
  { kind: "intro", dur: 120 },
  { kind: "chapter", dur: 66, n: "01", title: "Para o cliente", sub: "Da vitrine ao horário confirmado" },
  { kind: "still", dur: 80, shot: "c01-vitrine-topo", chapter: CLIENTE, caption: "A vitrine pública: quem chega pelo Instagram já vê a casa" },
  { kind: "scroll", dur: 190, shot: "c02-vitrine-pagina", chapter: CLIENTE, caption: "Serviços, preços, equipe e horário de funcionamento, sempre atualizados", stop: 0.82 },
  { kind: "click", dur: 76, shot: "c03-barbeiro", chapter: CLIENTE, caption: "Passo 1 de 5: escolha o barbeiro" },
  { kind: "click", dur: 70, shot: "c04-servico", chapter: CLIENTE, caption: "Passo 2: o serviço, com preço e duração" },
  { kind: "click", dur: 70, shot: "c05-dia", chapter: CLIENTE, caption: "Passo 3: só aparecem os dias com horário livre" },
  { kind: "click", dur: 70, shot: "c06-horario", chapter: CLIENTE, caption: "Passo 4: o horário, sem risco de marcar em cima de outro" },
  { kind: "click", dur: 84, shot: "c08-entrar", chapter: CLIENTE, caption: "O login é pedido só agora, na hora de confirmar" },
  { kind: "click", dur: 76, shot: "c09-confirmar", chapter: CLIENTE, caption: "Passo 5: confere tudo e confirma" },
  { kind: "still", dur: 96, shot: "c10-confirmado", chapter: CLIENTE, caption: "Confirmado. O cliente recebe e-mail agora e um lembrete 24h antes", ding: true },
  { kind: "click", dur: 96, shot: "c11-meus", chapter: CLIENTE, caption: "Em Meus agendamentos, ele remarca ou cancela sozinho" },
  { kind: "mobile", dur: 156 },
  { kind: "chapter", dur: 66, n: "02", title: "Para a administração", sub: "A barbearia inteira numa tela" },
  { kind: "click", dur: 76, shot: "a01-entrar", chapter: ADMIN, caption: "A equipe entra com a própria conta" },
  { kind: "still", dur: 84, shot: "a02-painel", chapter: ADMIN, caption: "Painel: o mês até hoje comparado ao mês anterior" },
  { kind: "scroll", dur: 180, shot: "a03-painel-pagina", chapter: ADMIN, caption: "Faturamento diário, ocupação de cada barbeiro e horários de pico", stop: 0.6 },
  { kind: "click", dur: 76, shot: "a04-agenda-dia", chapter: ADMIN, caption: "A agenda do dia, lado a lado por barbeiro" },
  { kind: "still", dur: 90, shot: "a05-agenda-semana", chapter: ADMIN, caption: "Ou a semana inteira, de todos ou de um barbeiro" },
  { kind: "click", dur: 76, shot: "a06-agenda-escolher", chapter: ADMIN, caption: "Cada atendimento abre o próprio detalhe" },
  { kind: "click", dur: 72, shot: "a08-forma", chapter: ADMIN, caption: "Na hora de fechar: o valor já vem preenchido, é só escolher a forma" },
  { kind: "click", dur: 66, shot: "a09-concluir", chapter: ADMIN, caption: "Pix, crédito, débito ou dinheiro" },
  { kind: "still", dur: 86, shot: "a10-concluido", chapter: ADMIN, caption: "Atendimento concluído e pagamento registrado", ding: true },
  { kind: "click", dur: 100, shot: "a11-relatorio", chapter: ADMIN, caption: "Relatório por período, barbeiro e forma de pagamento, com exportação em CSV" },
  { kind: "outro", dur: 150 },
];

/** Sobreposição entre itens vizinhos (troca em fusão). */
export const OVERLAP = 10;

export const TIMED = (() => {
  let at = 0;
  return ITEMS.map((it, i) => {
    const from = i === 0 ? 0 : at - OVERLAP;
    at = from + it.dur;
    return { ...it, from };
  });
})();

export const TOTAL = TIMED[TIMED.length - 1].from + TIMED[TIMED.length - 1].dur;
