# Design system

> **O que é:** as regras para montar qualquer tela da Augusto Barbearia, com os fundamentos, os componentes e os padrões de uso.
> **Fontes:** a marca (logo, paleta, fontes e tom) está em [identidade-visual.md](identidade-visual.md). A linguagem visual vem da referência [Beard X](referencia-beard-x.md), e o fluxo de agendamento, do padrão Squire descrito lá.
> **Onde ver:** a página `/design-system` do web renderiza os tokens e os componentes com o mesmo código das telas. Ela não aparece no menu nem nos buscadores.

## Princípios

1. **Clareza antes de efeito.** O cliente agenda pelo celular, muitas vezes com pressa. Cada tela tem uma ação principal, que é o único botão em `brand`.
2. **Mobile first, em 360px.** Toda tela nasce no celular e cresce para o desktop. Alvos de toque têm no mínimo 44px.
3. **Acessível por padrão.** O contraste segue o WCAG AA, o foco fica sempre visível, e a cor nunca é a única informação: o texto também diz o estado.
4. **Só tokens.** Cor, fonte, sombra e movimento vêm dos tokens em `web/src/app/globals.css`. Hex solto no componente é bug.
5. **Funciona sem JavaScript.** Formulários são `<form>` com Server Actions e campos nativos. O JS melhora a experiência, mas nada depende dele para aparecer ou funcionar.

## Dois modos

O mesmo sistema tem dois ritmos:

| | Vitrine (`(publico)`) | Área logada (`(cliente)` e `admin`) |
|---|---|---|
| Objetivo | Encantar e levar a agendar | Concluir a tarefa rápido |
| Títulos | Playfair, escala `text-display-*`, ornamento acima | Inter 600 (`text-2xl`/`text-xl`), sem ornamento |
| Respiro | Seções de 80px (celular) a 128px (desktop) | Blocos de 24 a 48px |
| Fundos | Faixas `ink` e `paper` alternadas | `paper` com cards em `surface` |
| Movimento | Cascata no hero e entrada ao rolar | Só hover e foco. Nada entra animado |

O fluxo de agendamento (`/agendar`) é da área logada, mas pode usar Playfair no título de cada etapa para manter a cara da vitrine.

## Fundamentos

### Cores

Os valores e o contraste estão em [identidade-visual.md](identidade-visual.md#cores). Aqui fica o papel de cada token:

| Papel | Token | Regra |
|---|---|---|
| Fundo da página | `paper` | Nunca branco puro na página inteira |
| Card, campo, modal | `surface` | Sempre com `shadow-card` ou borda |
| Texto principal | `ink` | — |
| Texto secundário | `ink-muted` | Também é a borda dos campos e dos chips, porque `line` tem só 1,3:1 sobre branco |
| Divisor decorativo | `line` | Nunca como única borda de algo interativo |
| Ação principal | `brand` → `brand-strong` no hover | Um por tela, ou por card |
| Faixa escura | `ink`, com texto `surface` e `on-ink-muted` | Destaque em `brand-on-dark`. O logo vai num círculo `surface` |
| Estados | `success`, `warning`, `danger` | Sempre acompanhados de texto |

### Tipografia

| Estilo | Classes | Uso |
|---|---|---|
| Display 1 | `font-heading text-display-1 font-bold` | Título do hero (um por página) |
| Display 2 | `font-heading text-display-2 font-bold` | Título de seção da vitrine |
| Display 3 | `font-heading text-display-3 font-bold` | Números de destaque, títulos de bloco |
| Título de card | `font-heading text-xl font-bold` | Nome do serviço, do barbeiro, do agendamento |
| Título da área logada | `text-2xl font-semibold` | Título da página em `(cliente)` e `admin` |
| Corpo | `text-base leading-relaxed` | Texto corrido. Na vitrine, `sm:text-lg` |
| Apoio | `text-sm text-ink-muted` | Dicas, metadados, legendas |
| Rótulo | `text-xs font-semibold uppercase tracking-[0.08em]` | Botões, badges, legendas de grupo, data acima de título |

- Horários e valores usam `tabular-nums`, para os números não "pularem" numa lista.
- Campos de formulário usam sempre 16px (`text-base`), senão o Safari do iPhone dá zoom ao focar.

### Espaço e layout

A escala é a do Tailwind (múltiplos de 4px). As combinações fixas são:

| Onde | Valor |
|---|---|
| Container | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (até 1280px) |
| Texto corrido e formulários | até `max-w-2xl` (672px) |
| Seção da vitrine | `py-20 lg:py-32` |
| Card | `p-6 sm:p-8` (vitrine: até `lg:p-10`) |
| Grade de cards | `gap-6` |
| Campos de um formulário | `gap-6` entre campos, `gap-2` dentro do campo |
| Ornamento → título | `mt-6` (24px) |

**Breakpoints:** os padrões do Tailwind, `sm` 640, `md` 768, `lg` 1024 e `xl` 1280px. Os do Webflow (479/767/991) não foram adotados: os padrões cobrem os mesmos saltos e evitam configuração própria.

### Forma e elevação

- **Raio 0** em tudo. As exceções são o círculo do logo sobre o escuro e, no futuro, a foto de perfil.
- **Uma sombra só:** `shadow-card`, em superfícies claras sobre `paper`. Modais podem somar uma camada `bg-ink/60` atrás.
- **Bordas:** 1px em campos, chips e cards sem sombra; 2px nos botões; 4px à esquerda nos avisos.
- **Foco:** contorno de 2px na cor da ação (`outline-brand` ou `outline-ink`), com afastamento de 2 a 4px. Nunca remova o foco sem pôr outro no lugar.

### Movimento

As regras completas estão em [identidade-visual.md](identidade-visual.md#movimento). Em resumo: 300ms no hover, 500ms nas entradas, sempre `ease-out`. Tudo respeita `prefers-reduced-motion`, e a área logada não tem entrada animada.

### Ícones e imagens

- **Ícones:** SVG inline próprio, traço de 2px em `currentColor`, tamanho de 16, 20 ou 24px (`size-4`, `size-5`, `size-6`), com `aria-hidden="true"` quando há texto ao lado. Não adotamos biblioteca de ícones por enquanto.
- **Fotos:** sempre `next/image`, com `alt` descritivo e proporção fixa (4:5 para barbeiro, 3:2 para serviço e galeria). O hover dá zoom de 1,05 dentro de uma moldura com `overflow-hidden`. Texto sobre foto exige um overlay `bg-ink/70`.
- Ainda não há fotos reais (pendência P10). Até lá, os barbeiros vão usar **fotos fictícias geradas por IA** como placeholder (D10), em `web/public/images/barbeiros/`, que entram na S3.10 (#63). Elas não retratam os proprietários e são trocadas quando as fotos reais chegarem. Fora isso, as telas funcionam sem foto (o barbeiro sem foto mostra um quadro neutro com a inicial), e nenhuma foto de banco de imagem entra no lugar.

## Componentes

Ficam em `web/src/components/ui`. Cada componente novo entra nesta tabela, na página `/design-system` e ganha teste.

| Componente | Arquivo | Status |
|---|---|---|
| `Button`, `ButtonLink` | `button.tsx` | Pronto |
| `TextField`, `TextAreaField`, `SelectField` | `field.tsx` | Pronto |
| `ChoiceChip` | `choice-chip.tsx` | Pronto |
| `Badge`, `StatusBadge` | `badge.tsx` | Pronto |
| `Alert` | `alert.tsx` | Pronto |
| `EmptyState` | `empty-state.tsx` | Pronto |
| `Ornament`, `SectionHeading` | `ornament.tsx`, `section-heading.tsx` | Pronto |
| Menu do celular, faixa de dias, card de serviço, card de barbeiro, card de agendamento, tabela, diálogo de confirmação, esqueleto de carregamento | — | Planejado: nasce com a primeira tela que precisar dele |

### Botão

- **`Button`** executa uma ação (`<button>`, `type="button"` por padrão; use `type="submit"` no formulário). **`ButtonLink`** navega (`next/link`). Nunca use `<a>` para ação nem `<button>` para navegar.
- **Variantes:**

| Variante | Quando |
|---|---|
| `primary` | A ação principal da tela: "Agendar horário", "Confirmar agendamento", "Salvar" |
| `outline` | Ação secundária ao lado da principal: "Ver serviços", "Remarcar" |
| `outline-light` | Qualquer botão sobre faixa `ink` |
| `danger` | Ação destrutiva: "Cancelar agendamento", "Marcar falta". Sempre pede confirmação |
| `ghost` | Ação de baixa ênfase: "Voltar", "Limpar filtro" |

- **Tamanhos:** `md` (56px, padrão) e `sm` (44px, dentro de cards e tabelas).
- **Estados:** hover troca a cor e sobe 2px (o `ghost` sublinha), foco com contorno, `disabled` a 50% e `pending` (trava o botão, mostra um indicador girando e marca `aria-busy`). Use `pending` enquanto uma Server Action roda, com o `useFormStatus` do React.
- **No celular,** o botão principal de um formulário ou etapa ocupa a largura toda (`w-full sm:w-auto`).
- **Texto:** verbo no infinitivo e o objeto, curto. "Agendar horário", não "Clique aqui".

### Campos

- **`TextField`** (texto, telefone, e-mail, número), **`TextAreaField`** (texto de várias linhas, como uma apresentação) e **`SelectField`** (lista nativa). Os três têm rótulo, dica (`hint`) e erro (`error`) ligados ao campo por `aria-describedby`.
- O rótulo fica **sempre visível acima** do campo. Placeholder é só exemplo, nunca rótulo.
- **Obrigatório é o padrão;** o campo opcional ganha "(opcional)" no rótulo (`optional`).
- **Erro:** a borda fica `danger`, e a mensagem aparece abaixo do campo. Quando a API devolve um erro de campo, o `message` dela vai direto para `error`. Erro geral (ex.: horário tomado) vai num `Alert` `danger` no topo do formulário.
- Use `type`, `inputMode` e `autoComplete` certos: `tel` no celular e `name` no nome. O teclado certo no celular evita erro.
- Campo desativado (`disabled`) usa fundo `paper` e explica o porquê na dica (ex.: "Vem da sua conta Google").
- **Fundo escuro:** os campos com só a linha de baixo do Beard X não foram adotados. Os formulários do MVP ficam em fundo claro.

### Chip de escolha

- **`ChoiceChip`** é um `radio` com cara de botão, para escolher **uma** opção de uma grade curta: o horário livre, a forma de pagamento.
- Agrupe os chips num `<fieldset>` com `<legend>` ("Manhã", "Tarde"). A grade tem 3 colunas no celular e 6 no desktop.
- **Estados:** livre (borda `ink-muted`), escolhido (`brand`), foco (contorno) e indisponível (riscado). Prefira **não mostrar** um horário indisponível; o riscado é para quando o contexto pede, como na remarcação.
- Por ser `radio`, funciona sem JS e com as setas do teclado.

### Badge

- **`StatusBadge`** mostra o status do agendamento: Agendado (neutro), Concluído (`success`), Cancelado (neutro apagado e riscado) e Faltou (`danger`). Ele recebe o valor do código (`SCHEDULED`, `COMPLETED`, `CANCELED`, `NO_SHOW`) e cuida do texto e da cor.
- **`Badge`** é a etiqueta genérica, com os tons `neutral`, `muted`, `brand`, `success`, `warning` e `danger`. Não é clicável.

### Aviso

- **`Alert`** dá retorno dentro da página, com título curto e texto opcional. Os tons são `info`, `success`, `warning` e `danger`.
- `danger` usa `role="alert"` (o leitor de tela lê na hora); os outros usam `role="status"`.
- Use depois de uma ação ("Seu horário está confirmado."), para um aviso de regra ("Faltam menos de 2 horas.") e para o `message` de erro da API.
- Não há toast. A confirmação aparece na página para onde a ação leva, porque toast some antes de ser lido e se perde no celular.

### Estado vazio

- **`EmptyState`** aparece quando uma lista não tem itens. Ele diz o que aconteceu e oferece o próximo passo: "Você ainda não tem horários" + "Agendar horário".
- Uma busca ou filtro sem resultado diz o filtro usado e oferece limpar.

### Ornamento e título de seção

- **`Ornament`** é o bigode entre duas linhas, sempre `aria-hidden`. Só na vitrine e no estado vazio.
- **`SectionHeading`** junta o ornamento, o título `h2` e o texto de apoio, alinhado ao centro ou à esquerda, com tom claro ou escuro.

## Padrões

### Formulário

1. Uma coluna, até `max-w-2xl`, com os campos na ordem em que a pessoa pensa.
2. Erro geral num `Alert` `danger` acima dos campos; erro de campo no próprio campo.
3. O botão principal no fim, com `pending` enquanto envia. No celular, ele ocupa a largura toda.
4. Depois de salvar, a página mostra o `Alert` de sucesso ou leva para a próxima tela.
5. A validação no web serve só para ajudar (formato do celular, campo vazio). Quem decide é a API, e o web mostra o `message` dela.

### Fluxo de agendamento

Proposta detalhada em [referencia-beard-x.md](referencia-beard-x.md#fluxo-de-agendamento-squire). As regras visuais:

- Uma etapa por tela: serviço → barbeiro → dia → horário → confirmar. O estado fica na URL (`?servico=&barbeiro=&data=&hora=`), então "voltar" do navegador funciona.
- No topo, a etapa atual por extenso ("Etapa 2 de 5 · Barbeiro"), sem barra de progresso.
- Serviço e barbeiro em cards selecionáveis (uma coluna no celular). Dia numa faixa de 7 dias. Horário em `ChoiceChip`, agrupado em Manhã e Tarde.
- No celular, uma barra fixa no rodapé resume o que já foi escolhido e leva à próxima etapa.
- A confirmação mostra o resumo completo, o aviso das 2h (D6) num `Alert` `info` e o botão "Confirmar agendamento".

### Confirmação destrutiva

Cancelar um agendamento, marcar falta ou excluir um cadastro abre um diálogo (`<dialog>` nativo) que diz o que vai acontecer e tem dois botões: o `danger` com o verbo ("Cancelar agendamento") e um `ghost` "Voltar". O foco começa no "Voltar".

### Carregamento

- Páginas que buscam dados mostram um esqueleto (`loading.tsx`) com blocos `bg-line` no formato do conteúdo. O pulso só acontece com `motion-safe`.
- Nunca uma tela branca com indicador girando no meio.

### Datas, horas e dinheiro

Tudo formatado com `Intl`, em `pt-BR` e no fuso `America/Sao_Paulo` (RN-01):

| Dado | Formato | Exemplo |
|---|---|---|
| Data em lista | dia da semana abreviado, dia e mês | Ter, 3 de nov |
| Data completa | dia da semana, dia, mês e ano | terça-feira, 3 de novembro de 2026 |
| Hora | 24h com dois dígitos | 14:30 |
| Duração | minutos, ou horas e minutos | 50 min · 1h 30min |
| Valor | moeda com centavos | R$ 70,00 |

### Área administrativa

- Densidade maior: `text-sm` em tabelas, botões `sm`, títulos em Inter.
- Tabelas viram lista de cards no celular. A agenda do dia é a primeira tela, organizada por barbeiro.
- O status sempre com `StatusBadge`. Valores em reais alinhados à direita, com `tabular-nums`.

## Texto

O tom está em [identidade-visual.md](identidade-visual.md#tom). Para a interface:

- **Botões e links:** verbo + objeto ("Agendar horário", "Remarcar", "Ver serviços").
- **Erros:** o que aconteceu e o que fazer, sem código ("Esse horário acabou de ser reservado. Escolha outro.").
- **Sucesso:** confirma o fato com o dado principal ("Seu horário está confirmado para terça, às 14:30.").
- **Vazio:** explica e convida ("Você ainda não tem horários").
- Nomes do domínio iguais em todo lugar: "agendamento", "horário", "serviço", "barbeiro", "barbearia".

## Acessibilidade (checklist de cada tela)

- [ ] Funciona em 360px sem rolagem horizontal.
- [ ] Contraste AA: texto 4,5:1, texto grande e bordas de controle 3:1.
- [ ] Todo controle é alcançável por Tab, na ordem visual, com foco visível.
- [ ] Um `h1` por página e títulos em ordem.
- [ ] Campos com rótulo; erros ligados ao campo.
- [ ] Imagens com `alt` (ou `alt=""` se forem decorativas).
- [ ] Funciona sem JS e com `prefers-reduced-motion: reduce`.

## Decisões em aberto

As três escolhas abaixo foram feitas na adaptação do Beard X e valem até que se decida o contrário:

| Tema | Escolha atual | Alternativa |
|---|---|---|
| Fonte dos títulos | Playfair Display 700, que conversa com o "A" serifado do logo | Uma sans condensada em caixa alta, como a Barlow do Beard X |
| Cor de acento | O vermelho da marca, que substitui o champanhe do Beard X | Um segundo acento quente para detalhes |
| Breakpoints | Padrões do Tailwind | Os do Webflow (479/767/991) |

## Como evoluir

1. Antes de criar um componente, veja se um existente resolve com uma variante.
2. Componente novo: entra em `web/src/components/ui`, na tabela acima, na página `/design-system` e ganha teste.
3. Token novo: entra em `globals.css`, em [identidade-visual.md](identidade-visual.md) (com o contraste, se for cor) e aqui, com o papel dele.
4. Mudou uma regra deste documento? Atualize no mesmo PR que muda o código.
