# Design system

> **O que é:** as regras para montar qualquer tela da Augusto Barbearia, com os fundamentos, os componentes e os padrões de uso.
> **Fontes:** a marca (logo, paleta, fontes e tom) está em [identidade-visual.md](identidade-visual.md). Desde 2026-11-06, a composição da vitrine é a do redesign Hallmark aprovado pelo dono do projeto, sobre a marca; a referência [Beard X](referencia-beard-x.md) fica como histórico, e o fluxo de agendamento continua no padrão Squire descrito lá.
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
| Títulos | Libre Caslon Text 400 em maiúsculas e minúsculas (#196), escala `text-display-*`, à esquerda e sem ornamento acima | Administração: Inter 600 (`text-2xl`/`text-xl`), sem ornamento |
| Respiro | Seções `py-section` (72 a 144px) e `py-section-l` (96 a 176px) | Telas do cliente: 40/64px acima e 64/96px abaixo (celular/`md`), blocos de 24 a 40px. Administração: blocos de 24 a 48px |
| Fundos | Faixas `ink`, `paper`, `surface` e `paper-2` alternadas; em `/barbeiros`, a faixa escura parcial que as fotos atravessam | `paper` com cards em `surface`, logo abaixo da faixa escura do cabeçalho |
| Movimento | Cascata no hero e entrada ao rolar | Só hover e foco. Nada entra animado |

O fluxo de agendamento (`/agendar`) e as telas do cliente (`/meus-agendamentos`, `/perfil`, `/entrar`) são da área logada, mas usam a base da vitrine desde a S4.07 (#80): títulos em Libre Caslon Text, em maiúsculas e minúsculas, o texto de apoio abaixo do título em `text-body`, o botão `md` (52px) na ação principal da tela e o hover em `ease-standard`. O ritmo continua o de tarefa: sem `py-section`, sem entrada animada e sem a faixa escura parcial (ver [Fluxo de agendamento](#fluxo-de-agendamento)).

## Fundamentos

### Cores

Os valores e o contraste estão em [identidade-visual.md](identidade-visual.md#cores). Aqui fica o papel de cada token:

| Papel | Token | Regra |
|---|---|---|
| Fundo da página | `paper` | Nunca branco puro na página inteira |
| Card, campo, modal | `surface` | Sempre com `shadow-card` ou borda. A vitrine não usa card: separa por filetes e troca de papel |
| Seção de papel mais escuro | `paper-2` | "Como funciona"; sem borda |
| Texto principal | `ink` | — |
| Texto secundário | `ink-muted` | Também é a borda dos campos e dos chips, porque `line` tem só 1,3:1 sobre branco |
| Divisor decorativo | `line` | Nunca como única borda de algo interativo |
| Ação principal | `brand` → `brand-strong` no hover, `ink` no pressionado | Um por tela, ou por card |
| Faixa escura | `ink`, com texto `surface` e `on-ink-muted` | Destaque em `brand-on-dark`. O logo vai num círculo `surface` |
| Estados | `success`, `warning`, `danger` | Sempre acompanhados de texto |

### Tipografia

| Estilo | Classes | Uso |
|---|---|---|
| Display do hero | `font-heading text-display-hero font-black uppercase` | O nome da barbearia no hero da página inicial |
| Display 1 | `font-heading text-display-1 font-black uppercase` | Título das páginas internas (um por página), a faixa "Agende pelo celular" e o nome no rodapé |
| Display 2 | `font-heading text-display-2 font-black uppercase` | Título de seção da vitrine |
| Display 3 | `font-heading text-display-3 font-black uppercase` | Nome do serviço, preço e nome do barbeiro; título das telas do cliente |
| Display 4 | `font-heading text-display-4 font-black uppercase` | Passos de "Como funciona", horários do quadro de contato, títulos pequenos de bloco, estado vazio, cards da área do cliente |
| Apoio grande | `text-lead` | A frase do hero e o texto ao lado de um título grande |
| Número menor | `font-heading font-semibold` | O dia no `DayPicker` (Libre Caslon Text 700) |
| Título da administração | `text-2xl font-semibold` | Título da página em `admin` (Inter) |
| Corpo da vitrine | `text-body` | Texto corrido da vitrine: 16px/1,55 no celular, 17px/1,6 a partir do `md` |
| Corpo da área logada | `text-base leading-relaxed` | Texto corrido em `(cliente)` e `admin`. Nas telas do cliente, o texto de apoio logo abaixo do `h1` usa `text-body` |
| Apoio | `text-sm text-ink-muted` | Dicas, metadados, legendas |
| Rótulo | `text-sm font-semibold` | Badges, legendas de grupo, duração do serviço, rótulos sobre o escuro. Em caixa normal e sem espaçamento extra: nada de caixa alta espaçada em texto pequeno |

- Horários e valores usam `tabular-nums`, para os números não "pularem" numa lista.
- Campos de formulário usam sempre 16px (`text-base`), senão o Safari do iPhone dá zoom ao focar.

### Espaço e layout

A escala é a do Tailwind (múltiplos de 4px). As combinações fixas são:

| Onde | Valor |
|---|---|
| Container da vitrine, do cabeçalho e do rodapé | `mx-auto max-w-site`, dentro de `px-4 sm:px-6 lg:px-8` (até 1340px) |
| Container da administração | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (até 1280px) |
| Bloco de título de seção | `SectionHeading`: título nas colunas 1 a 7 de 12, apoio e ação nas colunas 8 a 12, alinhados pela base |
| Texto corrido e formulários | até `max-w-2xl` (672px) |
| Seção da vitrine | `py-section`: 72, 88 (`sm`), 120 (`md`) e 144px (`lg`); `py-section-l`: 96, 112, 144 e 176px |
| Faixa escura das páginas internas | `PageHero`: título com `pt-16 pb-12`, `md:pb-16`, `lg:pt-24 lg:pb-20`; com `band` (padrão), faixa parcial de 128, 192 (`md`) e 240px (`lg`) atrás do começo do conteúdo; sem ela (`/servicos`), o conteúdo começa com `pt-12 lg:pt-20`. Fecha com `pb-section` |
| Telas do cliente | `pt-10 pb-16 md:pt-16 md:pb-24`, até `max-w-3xl` (perfil: `max-w-2xl`); `mt-8` entre o título e o resumo, `mt-10` antes do conteúdo da etapa |
| Card | `p-6 sm:p-8` (a vitrine não usa card) |
| Tabela de preços | linhas de `py-7` (`md:py-9`) entre filetes `line`, aberta por um filete de 2px em `ink` |
| Grade de barbeiros | `gap-x-8 gap-y-14`, colunas `minmax(0,1fr)` |
| Campos de um formulário | `gap-6` entre campos, `gap-2` dentro do campo |
| Ornamento → título (só no hero) | `mt-6` (24px) |

**Breakpoints:** os padrões do Tailwind, `sm` 640, `md` 768, `lg` 1024 e `xl` 1280px. Os do Webflow (479/767/991) não foram adotados: os padrões cobrem os mesmos saltos e evitam configuração própria.

### Forma e elevação

- **Raio 0** em tudo. As exceções são o círculo do logo sobre o escuro e, no futuro, a foto de perfil.
- **Uma sombra só:** `shadow-card`, um filete de 1px a 5%, em superfícies claras da área logada. A vitrine não usa card nem sombra. Modais podem somar uma camada `bg-ink/60` atrás.
- **Bordas:** 1px em campos, chips, cards sem sombra e filetes; 2px nos botões e no filete que abre a tabela de preços; 4px à esquerda nos avisos. As fotos levam um contorno interno de 1px em `ink` a 10%.
- **Foco:** contorno de 2px na cor da ação (`outline-brand` ou `outline-ink`), com afastamento de 2 a 4px. Nunca remova o foco sem pôr outro no lugar.

### Movimento

As regras completas estão em [identidade-visual.md](identidade-visual.md#movimento). Em resumo: hover só troca a cor (200ms nos botões), e a entrada ao rolar é um só movimento (sobe 8px em 420ms). Tudo usa `ease-standard` (`cubic-bezier(0.16, 1, 0.3, 1)`), nunca o `ease` do navegador. Os valores de `data-reveal` (`rise`, `fade`, `zoom`) continuam aceitos; `rise` e `zoom` fazem o mesmo movimento. O `RevealObserver` fica na página que usa o atributo, e o CSS só esconde o pendente sob a classe `.js` que ele põe no `<html>`. Tudo respeita `prefers-reduced-motion`, e a área logada não tem entrada animada.

### Ícones e imagens

- **Ícones:** SVG inline próprio, traço de 2px em `currentColor`, tamanho de 16, 20 ou 24px (`size-4`, `size-5`, `size-6`), com `aria-hidden="true"` quando há texto ao lado. Não adotamos biblioteca de ícones por enquanto.
- **Fotos:** sempre `next/image`, com `alt` descritivo (ou `alt=""` se decorativas), `object-cover` e moldura de proporção fixa para reservar o espaço antes da carga. As proporções são:

  | Uso | Proporção |
  |---|---|
  | Card de barbeiro (vitrine, administração e agendamento) | 4:5 |
  | "Sobre" | 4:3 |
  | Galeria: retrato à esquerda / faixa à direita / bancada / barba | Desktop: o retrato ocupa 5 colunas e as duas linhas; a navalha 16:10 em 7 colunas; abaixo dela, a bancada 4:5 em 3 colunas e a barba em 4. Tablet (640 a 1023px): grade 2 × 2, retrato e navalha em 4:5, bancada e barba quadradas. Celular: retrato 4:5 e navalha 16:10 na largura toda, bancada e barba quadradas lado a lado |
  | Mosaico | 1:1 |
  | Fundos do hero e dos heros internos | Arquivos 16:9, recortados conforme a tela |

- As fotos ficam paradas: o zoom no hover saiu no redesign de 2026-11-06. As molduras usam `data-reveal="zoom"` e os textos, `data-reveal="rise"`, com o mesmo movimento. Nada fica escondido quando não há JS.
- As fotos da faixa de agendamento (`faixa-agendar.jpg`) e de "Como funciona" (`como-funciona-cadeira.jpg`, `como-funciona-celular.jpg`) saíram da página, para que duas seções seguidas nunca sejam de fotos. Os arquivos e as entradas em `vitrine-photos.ts` ficam para uso futuro.
- **Texto sobre foto:** no hero inicial, um degradê `bg-linear-to-tr from-ink/90 via-ink/55 to-ink/15`, que escurece só o lado do texto (embaixo, à esquerda); `bg-ink/80` nos títulos das páginas internas. O nome do barbeiro fica abaixo da foto, fora dela. Todo texto precisa manter contraste AA, inclusive sobre o ponto mais claro da foto.
- **Prioridade:** só a foto que abre a página usa `preload` e `fetchPriority="high"`, com `fill` e `sizes="100vw"` (o `priority` está obsoleto desde o Next 16): a do hero inicial e a do topo de `/servicos` e `/barbeiros`, que são o LCP de cada página. Todas as demais fotos mantêm o lazy padrão de `next/image` e um `sizes` adequado à grade. A cascata de entrada do hero fica apenas no conteúdo.
- **Foto fixa:** no hero inicial, a seção tem `[clip-path:inset(0)]`, a camada da foto é `absolute inset-0 motion-safe:lg:fixed` e o overlay acompanha a camada. No celular e com menos movimento, rola junto; no desktop, fica parada e recortada pela seção. O hero tem `min-h-svh`.
- **Placeholders (P10):** os barbeiros usam fotos fictícias geradas por IA desde a D10 (#63), em `web/public/images/barbeiros/`; a D12 (#72) cobre `web/public/images/vitrine/hero.jpg` (16:9, pelo menos 2400×1350) e `sobre.jpg` (3:2, pelo menos 1800×1200), até 400 KB cada. A D14 (#125) estende a escolha à galeria, faixa de agendamento, "Como funciona", heros internos e mosaico, com arquivos e limites definidos no [plano](../planos/imagens-vitrine.md#4-especificação-de-cada-imagem). São JPEGs progressivos, sRGB, sem EXIF e com qualidade próxima de 80, revisados quanto a anatomia, ferramentas e paleta.
- As fotos fictícias não retratam a Augusto Barbearia nem os proprietários, não vêm de banco de imagem nem do Beard X e serão substituídas pelas reais. Não contêm rostos identificáveis, texto, logotipos nem rótulos legíveis. O barbeiro sem foto mantém o quadro neutro com a inicial. O "Sobre" só aparece com texto preenchido, com o texto fora da foto. Os serviços continuam sem foto; depoimentos e conteúdo real de Instagram aguardam material dos proprietários. O mosaico é uma composição de fotos, sem posts simulados e com link externo apenas quando `shop.instagram` existir.

## Componentes

Ficam em `web/src/components/ui`. Cada componente novo entra nesta tabela, na página `/design-system` e ganha teste.

| Componente | Arquivo | Status |
|---|---|---|
| `Button`, `ButtonLink` | `button.tsx` | Pronto |
| `TextField`, `TextAreaField`, `SelectField` | `field.tsx` | Pronto |
| `ChoiceChip` | `choice-chip.tsx` | Pronto |
| `Checkbox` | `checkbox.tsx` | Pronto |
| `Badge`, `StatusBadge` | `badge.tsx` | Pronto |
| `Alert` | `alert.tsx` | Pronto |
| `EmptyState` | `empty-state.tsx` | Pronto |
| `Ornament`, `SectionHeading` | `ornament.tsx`, `section-heading.tsx` | Pronto (o ornamento só no hero desde 2026-11-06) |
| `FloatingOrnament` | `floating-ornament.tsx` | Fora de uso desde 2026-11-06: ilustração desenhada não entra na vitrine |
| `ServiceCard`, `ServiceItem`, `BarberCard`, `BarberPhoto` | `service-card.tsx`, `barber-card.tsx`, `barber-photo.tsx` | Pronto |
| `FramedPhoto`, `FixedPhotoLayer` | `framed-photo.tsx`, `fixed-photo-layer.tsx` | Prontos (#126): moldura de proporção fixa e camada fixa com o véu configurável |
| `Gallery` | `components/vitrine/gallery.tsx` | Pronta (#127): mosaico de 4 fotos em 5 + 7 colunas |
| `BookingBand` | `components/vitrine/booking-band.tsx` | Pronta (#128): faixa `ink` só com tipo, a frase grande à esquerda e o botão à direita |
| `HowItWorks` | `components/vitrine/how-it-works.tsx` | Pronta (#129): os quatro passos numa `ol` numerada (`.steps`), sem fotos |
| `PhotoMosaic` | `components/vitrine/photo-mosaic.tsx` | Pronto (#131): mosaico com as fotos aprovadas na D14 e Instagram condicional |
| `MobileMenu` | `mobile-menu.tsx` | Pronto |
| `SiteHeader`, `HeaderFrame` | `components/site-header.tsx`, `header-frame.tsx` | Pronto (cabeçalho de todas as páginas) |
| `DayPicker`, `TimePicker` | `components/booking/day-picker.tsx`, `time-picker.tsx` | Pronto (escolha de dia e de horário do agendamento, reaproveitável na remarcação) |
| `ContactNotice` | `components/booking/contact-notice.tsx` | Pronto (aviso com os contatos da barbearia: depois do início e em cima da hora, RN-14) |
| Card de agendamento do cliente | `app/(cliente)/meus-agendamentos/appointment-card.tsx` | Pronto (só em "Meus agendamentos"; a agenda da administração terá o seu) |
| Agenda da administração: `AgendaToolbar`, `AgendaDayView`, `AgendaWeekView`, `AgendaBarberColumn`, `AgendaItem`, `AppointmentDetail` | `app/admin/agenda/` | Pronto (só na agenda; recebem as ações das próximas issues por `actions`, `children`, `barberExtra` e `dayExtra`) |
| Tabela, diálogo de confirmação, esqueleto de carregamento | — | Planejado: nasce com a primeira tela que precisar dele |

### Botão

- **`Button`** executa uma ação (`<button>`, `type="button"` por padrão; use `type="submit"` no formulário). **`ButtonLink`** navega (`next/link`). Nunca use `<a>` para ação nem `<button>` para navegar.
- **Variantes:**

| Variante | Quando |
|---|---|
| `primary` | A ação principal da tela: "Agendar horário", "Confirmar agendamento", "Salvar" |
| `outline` | Ação secundária ao lado da principal: "Ver serviços", "Remarcar" |
| `outline-light` | Botão secundário sobre faixa `ink`. O `primary` também pode ficar no `ink` quando é a ação principal da faixa ("Agendar horário" no hero): a borda `brand` tem 3,3:1 sobre `ink`, e o texto, 5,8:1 sobre `brand` |
| `danger` | Ação destrutiva: "Cancelar agendamento", "Marcar falta". Sempre pede confirmação |
| `ghost` | Ação de baixa ênfase: "Voltar", "Limpar filtro" |
| `ghost-light` | O `ghost` sobre faixa `ink`: o "Sair" do cabeçalho |

- **Texto:** Barlow 900 em caixa alta (`font-button`), com 0,02em de espaçamento e sem quebra de linha (16px no `md`; 14px no `sm`).
- **Tamanhos:** `md` (padrão: 52px em todas as telas) e `sm` (44px: administração, cabeçalho, linhas de serviço, cards e tabelas). Na administração, todos os botões são `sm`. Nas telas do cliente, a ação principal da tela é sempre `md`: "Confirmar agendamento", "Salvar", "Entrar com Google", "Cancelar agendamento" e o botão do estado vazio que faz a pessoa seguir ("Agendar horário", "Escolher outro dia"); as ações dentro de um cartão ("Remarcar", "Cancelar") continuam `sm`.
- **Estados:** hover só troca a cor, em 200ms (o `ghost` sublinha); o pressionado (`active:`) escurece um degrau; foco com contorno; `disabled` a 55% com `cursor-not-allowed` e o atributo nativo; e `pending` (trava o botão, mostra um indicador girando e marca `aria-busy`). Use `pending` enquanto uma Server Action roda, com o `useFormStatus` do React.
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
- Os chips-link do agendamento (`TimePicker`, `DayPicker`) têm a mesma borda e o mesmo hover, com o número em Libre Caslon Text 700 (`font-heading font-semibold`): o horário em 18px, com 44px de altura, e o dia em 24px, num chip de 80px.
- **Estados:** livre (borda `ink-muted`), escolhido (`brand`), foco (contorno) e indisponível (riscado). Prefira **não mostrar** um horário indisponível; o riscado é para quando o contexto pede, como na remarcação.
- Por ser `radio`, funciona sem JS e com as setas do teclado.

### Caixa de seleção

- **`Checkbox`** é um `checkbox` nativo para escolher **várias** opções de uma lista curta, como os barbeiros que realizam um serviço.
- Agrupe as caixas num `<fieldset>` com `<legend>` ("Quem realiza"), uma por linha. A dica do grupo fica abaixo da última caixa, ligada ao `fieldset` por `aria-describedby`.
- O rótulo envolve a caixa, então o texto inteiro é clicável, e a linha tem 44px de altura.
- **Estados:** desmarcada (borda `ink-muted`), marcada (`brand` com o visto em `surface`), foco (contorno) e desativada (fundo `paper`, texto `ink-muted`).

### Badge

- **`StatusBadge`** mostra o status do agendamento: Agendado (neutro), Concluído (`success`), Cancelado (neutro apagado e riscado) e Faltou (`danger`). Ele recebe o valor do código (`SCHEDULED`, `COMPLETED`, `CANCELED`, `NO_SHOW`) e cuida do texto e da cor.
- **`Badge`** é a etiqueta genérica, com os tons `neutral`, `muted`, `brand`, `success`, `warning` e `danger`. Não é clicável.

### Aviso

- **`Alert`** dá retorno dentro da página, com título curto e texto opcional. Os tons são `info`, `success`, `warning` e `danger`.
- `danger` usa `role="alert"` (o leitor de tela lê na hora); os outros usam `role="status"`.
- Use depois de uma ação ("Seu horário está confirmado."), para um aviso de regra ("Faltam menos de 2 horas para o seu horário.") e para o `message` de erro da API.
- Não há toast. A confirmação aparece na página para onde a ação leva, porque toast some antes de ser lido e se perde no celular.

### Estado vazio

- **`EmptyState`** aparece quando uma lista não tem itens. Ele diz o que aconteceu e oferece o próximo passo: "Você ainda não tem horários" + "Agendar horário".
- Tem fundo `surface` e borda tracejada `ink-muted`, para continuar legível também sobre a faixa escura parcial das páginas internas (S4.07, #80).
- Uma busca ou filtro sem resultado diz o filtro usado e oferece limpar.

### Cards da vitrine

- **`ServiceCard`:** a tabela de preços, como a da parede da barbearia. Não é card: abre com um filete de 2px em `ink` e recebe a `ul` das linhas, separadas por filetes `line`. A página inicial e `/servicos` usam a mesma tabela.
- **`ServiceItem`:** uma linha da tabela. À esquerda (7 de 12 colunas), o nome em `text-display-3`, a duração em `text-sm` semibold, a descrição opcional e "Com <barbeiros>". Depois, o preço em `text-display-3`, `ink` e `tabular-nums`, alinhado à direita (3 colunas), e o botão "Agendar" (`outline`, `sm`, 2 colunas), com o nome do serviço no nome acessível ("Agendar Corte Simples"). No celular, o nome e o preço dividem a primeira linha, e o botão ocupa a largura toda abaixo. Preço e duração levam um prefixo só para leitor de tela ("Preço:", "Duração:").
- **`BarberCard`:** o retrato 4:5 limpo (ou a inicial) e, logo abaixo, o nome em `text-display-3`, `ink`, a primeira linha da apresentação (`ink-muted`, cortada em uma linha) e "Agendar com <nome>".
  - Com `fullBio` (`/barbeiros`), a apresentação aparece inteira, sem o corte.
  - A foto fica parada: sem zoom no hover.
- **`BarberPhoto`:** a moldura com `next/image`, em 4:5 (padrão) ou 6:7 (`ratio="6/7"`, hoje sem uso na vitrine), com o contorno interno de `ink` a 10%. Sem foto, mostra a inicial do nome (decorativa, `aria-hidden`), num tamanho que acompanha a largura da moldura. A prop `zoom` continua aceita, mas a vitrine não a usa.
- `ServiceItem` e `BarberCard` recebem o nível do título: `h3` dentro de uma seção com título (página inicial) e `h2` numa página que só tem o `h1` antes (`/servicos`, `/barbeiros`).
- Em grade: barbeiros em 1 coluna no celular e 3 a partir do `md` (768px), como um conjunto, para três barbeiros nunca deixarem um sozinho na última linha: retratos do mesmo tamanho e topos alinhados, sem degraus.
- Cada item das grades entra com `data-reveal="rise"` e a cascata de `--reveal-index`/`--reveal-cols`.

### Páginas internas da vitrine

- **`PageHero`** (`components/vitrine/page-hero.tsx`) monta o topo de `/servicos` e `/barbeiros` (S4.07, #80): a faixa `ink` com o `h1` em `text-display-1` e o texto de apoio em `text-lead`, sem ornamento, e logo abaixo, com `band` (padrão), uma **faixa escura parcial** que o conteúdo (`children`) atravessa. `/servicos` usa `band={false}`: a tabela de preços é texto escuro sobre o papel e começa abaixo da faixa escura.
- Desde a #130, recebe `photo?: { src: string }`: a foto decorativa preenche só a faixa do título sob overlay `ink/80`, com `preload` e `fetchPriority="high"` por ser o LCP da página. `/servicos` usa a bancada e `/barbeiros`, as três cadeiras vazias. Sem `photo`, o topo continua liso.
- A faixa parcial é uma camada decorativa (`aria-hidden`, `absolute`, `-z-10` dentro de um bloco `relative isolate`) de 128px no celular, 192px a partir do `md` e 240px a partir do `lg`. Ela fica atrás do começo do conteúdo, então as fotos dos barbeiros começam no escuro e terminam no `paper`.
- O que pode aparecer sobre a faixa tem fundo próprio: as fotos, o `Alert` (`surface`) e o `EmptyState` (`surface`).
- O conteúdo do topo entra em cascata como o hero da página inicial: título em 80ms e texto em 160ms (`animate-rise`). A faixa parcial não se move.

### Cabeçalho

- **`SiteHeader`** fica no layout raiz e é sempre escuro: o logo no círculo `surface` (o PNG só funciona sobre o claro, P1), o nome em Libre Caslon Text, a navegação em `surface` com o traço `brand` na página atual, a conta (`outline-light` e `ghost-light`) e o "Agendar" (`primary`, `sm`). Tem 80px de altura e segue o container da vitrine.
- **A conta leva à área de cada um** (#143). O papel vem de `GET /me`, no `Suspense` da conta: o cliente vê "Meus agendamentos" e "Perfil", e a administração vê "Administração", numa `nav` "Sua conta" no mesmo estilo da navegação (linha no desktop, coluna no menu do celular). No desktop, o "Olá, Nome" sai da linha para caber em 1024px, e os links não quebram; no menu do celular, ele fica junto do "Sair". Sem resposta da API, a conta fica só com o nome e o "Sair".
- **Não é fixo**, como no Beard X: em todas as páginas, ele rola com a página, e quem rola o deixa para trás (decisão de 2026-11-01, #116). Por isso as seções com âncora (`#contato`) não precisam de `scroll-margin`.
- **`HeaderFrame`** decide o modo pela página (`data-mode`), sem depender de JS:

| Modo | Onde | Como fica |
|---|---|---|
| `hero` | Página inicial | Transparente no topo do hero, que é escuro: nunca fica sobre fundo claro |
| `bar` | Todas as outras páginas | Faixa `ink` no topo, contínua com o `PageHero` |

- As telas do cliente (`/agendar`, `/meus-agendamentos`, `/perfil`, `/entrar`) e a administração usam a mesma faixa escura. Ela combina com o rodapé escuro, e o conteúdo claro começa logo abaixo dela; não há variante clara.

### Menu do celular

- **`MobileMenu`** é um `<details>` nativo com o botão "Menu" (ícone e texto em `text-sm`, contorno claro). Abaixo de 1024px, ele guarda a navegação, o "Agendar horário" na largura toda e o login; a partir de 1024px, tudo fica na linha do cabeçalho.
- Funciona sem JS. Com JS, fecha com Esc (o foco volta para o botão), ao navegar e ao escolher um link, e abre com a página no topo: como o cabeçalho rola com a página, o painel aberto com ele em parte fora da tela não chegaria ao fim dela.
- O painel é escuro (`ink`) e desce de trás do cabeçalho em 420ms `ease-standard` (`animate-menu-down`), recortado por uma moldura com `overflow-hidden`. Ele ocupa o resto da tela e rola sozinho se o conteúdo não couber. A animação só vale com o menu aberto, para recomeçar a cada abertura; com `prefers-reduced-motion`, ele abre sem animação.
- Aberto, ele trava a rolagem da página pelo CSS (`overflow: clip` em `html:has([data-mobile-menu][open])`, abaixo de 1024px), então isso também funciona sem JS. Sobre o hero, o cabeçalho escurece junto com o painel.
- Aberto, com JS, ele deixa `inert` tudo o que está no `body` fora do cabeçalho (o link de salto, o `main`, o rodapé), menos o anunciador de rotas do Next. Assim o Tab não leva o foco a um link escondido atrás do painel (#152); fechar o menu, ou sair da página com ele aberto, devolve tudo ao normal.
- O link da página atual tem `aria-current="page"` e um traço em `brand`.

### Ornamento e título de seção

- **`Ornament`** é o bigode entre duas linhas, sempre `aria-hidden`. Na vitrine, fica só no hero da página inicial, acima do nome; fora dela, nas páginas de entrada, privacidade, não encontrada e no estado vazio.
- **`SectionHeading`** abre a seção só com o título `h2`, sem ornamento nem rótulo acima. Alinhado à esquerda por padrão: o título nas colunas 1 a 7 de 12 e, com `description` ou `aside` (uma ação, como "Ver todos os serviços"), o apoio e a ação nas colunas 8 a 12, alinhados à direita e pela base. No celular, tudo empilha. `align="center"` fica para o que é simétrico; `tone="dark"` para o fundo `ink`.
- **`FloatingOrnament`** (navalha, tesoura e pente, S4.06, #79) saiu da vitrine no redesign de 2026-11-06: ilustração desenhada não entra. O componente continua no código, sem uso.

### Fotos compartilhadas

- `vitrine-photos.ts` concentra os caminhos, textos alternativos e dimensões para a substituição na P10.
- `FramedPhoto` recebe `photo`, `sizes` e `ratioClassName` (3:2 por padrão); a moldura reserva espaço, leva o contorno interno de `ink` a 10% e aceita os atributos de entrada. A foto fica parada.
- `FixedPhotoLayer` recebe `photo`, `imageClassName`, `preload` (só no hero inicial) e `overlayClassName` (padrão `bg-ink/70`; o hero passa o degradê). A seção deve ter `[clip-path:inset(0)]`, conteúdo `relative` acima do overlay e fundo `ink`.

### Composição da página inicial

Desde o redesign de 2026-11-06, a página inicial segue o Hallmark: cada seção tem uma composição própria, e as vizinhas não repetem a mesma estrutura nem são duas seções de fotos seguidas.

- **Ordem:** hero (`ink`) → "Sobre" opcional (`paper`) → serviços (`py-section-l`) → galeria → "Agende pelo celular" (`ink`) → equipe (`paper`) → "Como funciona" (`paper-2`, `py-section-l`) → horário e contato (`ink`) → rodapé (`ink`, separado por um filete). Serviços e galeria alternam `surface`/`paper` com o "Sobre" preenchido e `paper`/`surface` sem ele.
- **Hero (Ledge):** a foto ocupa a tela, e o nome descansa embaixo, à esquerda, em `text-display-hero`, com o ornamento acima, a frase em `text-lead` e os dois botões. O degradê escurece só esse canto.
- **"Sobre":** o texto nas colunas 1 a 5 e a foto 4:3 nas colunas 6 a 12.
- **Serviços:** a tabela de preços (`ServiceCard` e `ServiceItem`), com o título à esquerda e, à direita, o apoio e "Ver todos os serviços".
- **Galeria:** mosaico de 12 colunas: o degradê em retrato nas colunas 1 a 5, ocupando as duas linhas; a navalha 16:10 nas colunas 6 a 12; abaixo dela, a bancada (3 colunas) e a barba (4 colunas). "Agendar horário" fica no `aside` do título. No tablet, uma grade 2 × 2 (retrato e navalha em 4:5). No celular, o retrato e a navalha na largura toda e as outras duas lado a lado.
- **"Agende pelo celular":** só tipo. A frase em `text-display-1` nas colunas 1 a 7, o texto em `text-lead` e o botão nas colunas 9 a 12, alinhados pela base.
- **Equipe:** os três retratos 4:5 alinhados, com "Conhecer a equipe" no `aside` do título.
- **"Como funciona":** os quatro passos lado a lado numa `ol` com a classe `.steps`: o numeral é o contador da lista, em Libre Caslon Text `brand` (`text-display-2`), sobre um filete `ink`, e o passo em `text-display-4`. Abaixo de um filete `line`, as duas condições (RN-51 e RN-14) em duas colunas. Sem fotos.
- **Horário e contato:** o título, o apoio e "Agendar horário" nas colunas 1 a 5; nas colunas 7 a 12, o quadro de horários (`BusinessHoursList size="lg"`: linhas entre filetes, o horário em `text-display-4`) e, abaixo, endereço e contatos em duas colunas.
- **Rodapé (mastro):** o logo e o nome em `text-display-1` de ponta a ponta; abaixo de um filete, o horário e o contato; e a linha legal com "Política de privacidade".
- **Heros internos:** foto opcional apenas na faixa do título, com overlay `bg-ink/80`. Em `/barbeiros`, a faixa parcial atrás do começo do conteúdo continua lisa; `/servicos` não a usa.
- **Mosaico** (`/servicos` e `/barbeiros`): destaque em largura total seguido de 4 fotos em 2×2 no celular; no `lg`, grade `1fr 2fr 1fr`, com o destaque no centro ocupando 2 linhas e gap de 28px. "Ver mais no Instagram" abre o perfil cadastrado em outra aba, com `rel="noopener noreferrer"`. O `PhotoMosaic` corrige a largura central pelo gap (`calc(50% - 14px)`), mantendo o destaque e as quatro laterais quadradas e alinhadas.

## Padrões

### Formulário

1. Uma coluna, até `max-w-2xl`, com os campos na ordem em que a pessoa pensa.
2. Erro geral num `Alert` `danger` acima dos campos; erro de campo no próprio campo.
3. O botão principal no fim, com `pending` enquanto envia. No celular, ele ocupa a largura toda.
4. Depois de salvar, a página mostra o `Alert` de sucesso ou leva para a próxima tela.
5. A validação no web serve só para ajudar (formato do celular, campo vazio). Quem decide é a API, e o web mostra o `message` dela.

### Fluxo de agendamento

Proposta detalhada em [referencia-beard-x.md](referencia-beard-x.md#fluxo-de-agendamento-squire). As regras visuais:

A implementação está na [spec do agendamento](../specs/agendamento-cliente.md).

- Uma etapa por tela: barbeiro → serviço → dia → horário → confirmar (D11). O estado fica na URL (`?barbeiro=&servico=&data=&hora=`), então "voltar" do navegador funciona.
- No topo, a etapa atual por extenso ("Etapa 2 de 5 · Serviço"), sem barra de progresso, e o título em `text-display-3`. Abaixo, as escolhas já feitas, cada uma com o link "Trocar".
- **Sem a faixa escura parcial** (S4.07, #80). A moldura (`BookingMain`) fica em `paper`, logo abaixo da faixa escura do cabeçalho. O fluxo segue o Squire, e não as páginas internas da vitrine; no celular, uma faixa a mais em cada uma das 5 etapas empurraria as opções para fora da primeira tela; e o cabeçalho escuro já faz a ligação com a vitrine. A mesma moldura serve a remarcação, "Meus agendamentos" e o cancelamento.
- **Cada escolha é um link:** um toque avança, sem botão "Continuar" e sem barra fixa no rodapé. Funciona sem JS.
- Barbeiro em cards com a foto (2 colunas no celular); serviço em cards com duração e preço (uma coluna). Dia com `DayPicker`: só os dias com horário, agrupados por mês, 3 por linha no celular. Horário com `TimePicker`: chips-link com a cara do `ChoiceChip`, agrupados em Manhã e Tarde, 3 por linha no celular. O `ChoiceChip` (`radio`) continua para formulários, como a forma de pagamento.
- A confirmação mostra o resumo completo, a política de alteração (D16) num `Alert` `info`, o campo Telefone quando o perfil não tem, e o botão "Confirmar agendamento". Depois de confirmar, a mesma página mostra "Horário confirmado", o resumo e "Ver meus agendamentos".
- **Remarcação** ([spec](../specs/meus-agendamentos.md)): o mesmo padrão em 4 etapas (barbeiro → dia → horário → confirmar), com o horário atual no topo do resumo. Entra pelo dia, com o barbeiro atual já escolhido; o "Trocar" do barbeiro volta à etapa de barbeiro.

### Meus agendamentos

- Um cartão por agendamento, em "Próximos" e "Histórico": serviço (`h3`), `StatusBadge`, dia, horário, barbeiro e valor. Um `SCHEDULED` que já passou mostra o `Badge` `muted` "Aguardando registro".
- As ações "Remarcar" (`outline`, `sm`) e "Cancelar" (`danger`, `sm`) aparecem só quando a API diz que pode (`can_reschedule`, `can_cancel`), com o prazo por extenso acima. O nome acessível inclui a data ("Cancelar o horário de terça-feira, 3 de novembro de 2026").
- Em cima da hora (`late_change`), o cartão mantém as ações e mostra acima delas o `ContactNotice` "Seu horário é daqui a pouco.". Sem as ações (o horário já começou), mostra o `ContactNotice` com a mensagem da API, em `warning`, com os links de contato.
- Depois de cancelar ou remarcar, a lista mostra um `Alert` `success` ("Agendamento cancelado.").

### Confirmação destrutiva

Cancelar um agendamento, marcar falta ou excluir um cadastro abre um diálogo (`<dialog>` nativo) que diz o que vai acontecer e tem dois botões: o `danger` com o verbo ("Cancelar agendamento") e um `ghost` "Voltar". O foco começa no "Voltar".

Na área do cliente, que precisa funcionar sem JS, a confirmação é uma **página** com o mesmo conteúdo: o resumo do que vai mudar, o `ghost` "Voltar" e o `danger` "Cancelar agendamento", nessa ordem (o "Voltar" vem primeiro no Tab). É o caso de `/meus-agendamentos/[id]/cancelar`.

### Carregamento

- Páginas que buscam dados mostram um esqueleto (`loading.tsx`) com blocos `bg-line` no formato do conteúdo. O pulso só acontece com `motion-safe`.
- Exceção: a vitrine (`/`, `/servicos`, `/barbeiros`) não tem esqueleto. Ela lê os dados do cache e chega inteira, sem troca de layout ([vitrine.md](../specs/vitrine.md#carregamento-e-cache)).
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

- Densidade maior: `text-sm` em tabelas, botões `sm` (inclusive o "Salvar" dos formulários), títulos em Inter.
- Da base nova da Sprint 4, a administração recebe só os tokens: a fonte e os botões (S4.03, #76) e o hover em `ease-standard` (S4.07, #80). Densidade, container (`max-w-7xl`) e layout não mudam.
- Tabelas viram lista de cards no celular.
- **Agenda** ([spec](../specs/agenda-admin.md)): o dia é uma lista por barbeiro, uma embaixo da outra no celular e lado a lado a partir do `lg`; a semana é um bloco por dia, um embaixo do outro no celular e em grade (até 7 colunas no `xl`). Cada dia mostra o horário de funcionamento (RN-02). Cada agendamento é um cartão-link com borda de 4px à esquerda (`line` nos cancelados e nas faltas): horário, `StatusBadge`, cliente e serviço (e o barbeiro, na semana com todos). A barra tem "Anterior", "Hoje" e "Próximo" (`outline`, `sm`), escolhas em links com `aria-current` (visão e barbeiro) e o formulário `GET` "Ir para a data": tudo funciona sem JS, com o estado na URL. O detalhe é um cartão com `dl` e as ações no fim: "Remarcar" (`outline`) e "Cancelar" (`danger`), só no agendamento ativo. "Novo agendamento" (`primary`, `sm`) fica na barra e segue o fluxo de agendamento em etapas, dentro da moldura da administração; o cancelamento tem a página de confirmação, como na área do cliente ([spec](../specs/agendamento-admin.md)).
- O status sempre com `StatusBadge`. Valores em reais alinhados à direita, com `tabular-nums`.

## Texto

O tom está em [identidade-visual.md](identidade-visual.md#tom). Para a interface:

- **Botões e links:** verbo + objeto ("Agendar horário", "Remarcar", "Ver serviços").
- **Erros:** o que aconteceu e o que fazer, sem código ("Esse horário acabou de ser reservado. Escolha outro.").
- **Sucesso:** confirma o fato com o dado principal ("Seu horário está confirmado para terça, às 14:30.").
- **Vazio:** explica e convida ("Você ainda não tem horários").
- Nomes do domínio iguais em todo lugar: "agendamento", "horário", "serviço", "barbeiro", "barbearia".

## Acessibilidade (checklist de cada tela)

- [ ] Funciona em 360px sem rolagem horizontal. Grade de cartões começa com `grid-cols-1` (`minmax(0, 1fr)`): sem colunas definidas, a coluna implícita cresce até o conteúdo, e um nome longo com `truncate` empurra a página para o lado (#150).
- [ ] Contraste AA: texto 4,5:1, texto grande e bordas de controle 3:1.
- [ ] Todo controle é alcançável por Tab, na ordem visual, com foco visível.
- [ ] Um `h1` por página e títulos em ordem.
- [ ] O conteúdo fica num `main` com `id="main-content"` e `tabIndex={-1}`, o alvo de "Pular para o conteúdo". Vale também para a página não encontrada (`app/not-found.tsx` e `app/admin/not-found.tsx`, #151).
- [ ] Campos com rótulo; erros ligados ao campo.
- [ ] Depois de enviar um formulário, a mensagem de erro (ou de sucesso na mesma página) recebe o foco e entra na tela: `Alert` com `revealOnMount="center"`. A página de destino de um redirecionamento com `?aviso=` abre no topo, com o aviso focado: `revealOnMount="top"` (#157).
- [ ] Imagens com `alt` (ou `alt=""` se forem decorativas).
- [ ] Funciona sem JS e com `prefers-reduced-motion: reduce`.

## Decisões em aberto

As três escolhas abaixo vieram da adaptação do Beard X e continuam valendo depois do redesign de 2026-11-06, que manteve a marca:

| Tema | Escolha atual | Alternativa |
|---|---|---|
| Fonte dos títulos | **Decidido em 2026-11-10 (#196):** Libre Caslon Text em maiúsculas e minúsculas, parecida com o logo do Instagram ([identidade-visual.md](identidade-visual.md#tipografia)). De 2026-10-31 (S4.03, #76) até a #196, era Barlow 900 em caixa alta, como o Beard X | Playfair Display, mais contrastada, ou Libre Baskerville, mais larga |
| Cor de acento | O vermelho da marca, que substitui o champanhe do Beard X | Um segundo acento quente para detalhes |
| Breakpoints | Padrões do Tailwind | Os do Webflow (479/767/991) |

## Como evoluir

1. Antes de criar um componente, veja se um existente resolve com uma variante.
2. Componente novo: entra em `web/src/components/ui`, na tabela acima, na página `/design-system` e ganha teste.
3. Token novo: entra em `globals.css`, em [identidade-visual.md](identidade-visual.md) (com o contraste, se for cor) e aqui, com o papel dele.
4. Mudou uma regra deste documento? Atualize no mesmo PR que muda o código.
