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
| Títulos | Barlow 900 em caixa alta, escala `text-display-*`, ornamento acima | Administração: Inter 600 (`text-2xl`/`text-xl`), sem ornamento |
| Respiro | Seções `py-section`, de 88px (celular) a 240px (desktop) | Telas do cliente: 40/64px acima e 64/96px abaixo (celular/`md`), blocos de 24 a 40px. Administração: blocos de 24 a 48px |
| Fundos | Faixas `ink` e `paper` alternadas; nas páginas internas, a faixa escura parcial que o conteúdo atravessa | `paper` com cards em `surface`, logo abaixo da faixa escura do cabeçalho |
| Movimento | Cascata no hero e entrada ao rolar | Só hover e foco. Nada entra animado |

O fluxo de agendamento (`/agendar`) e as telas do cliente (`/meus-agendamentos`, `/perfil`, `/entrar`) são da área logada, mas usam a base da vitrine desde a S4.07 (#80): títulos em Barlow 900 em caixa alta, o texto de apoio abaixo do título em `text-body`, o botão `md` (84px a partir do `md`) na ação principal da tela e o hover de 300ms `ease-standard`. O ritmo continua o de tarefa: sem `py-section`, sem entrada animada e sem a faixa escura parcial (ver [Fluxo de agendamento](#fluxo-de-agendamento)).

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
| Display 1 | `font-heading text-display-1 font-black uppercase` | Título do hero e das páginas internas (um por página) |
| Display 2 | `font-heading text-display-2 font-black uppercase` | Título de seção da vitrine |
| Display 3 | `font-heading text-display-3 font-black uppercase` | Nome nos cards da vitrine, preço do serviço, título das telas do cliente |
| Display 4 | `font-heading text-display-4 font-black uppercase` | Títulos pequenos de bloco, estado vazio, cards da área do cliente |
| Número menor | `font-heading font-semibold` | O dia no `DayPicker` (Barlow 600) |
| Título da administração | `text-2xl font-semibold` | Título da página em `admin` (Inter) |
| Corpo da vitrine | `text-body` | Texto corrido da vitrine: 16px/1,5 no celular, 18px/1,667 a partir do `md` |
| Corpo da área logada | `text-base leading-relaxed` | Texto corrido em `(cliente)` e `admin`. Nas telas do cliente, o texto de apoio logo abaixo do `h1` usa `text-body` |
| Apoio | `text-sm text-ink-muted` | Dicas, metadados, legendas |
| Rótulo | `text-xs font-semibold uppercase tracking-[0.08em]` | Botões, badges, legendas de grupo, data acima de título |

- Horários e valores usam `tabular-nums`, para os números não "pularem" numa lista.
- Campos de formulário usam sempre 16px (`text-base`), senão o Safari do iPhone dá zoom ao focar.

### Espaço e layout

A escala é a do Tailwind (múltiplos de 4px). As combinações fixas são:

| Onde | Valor |
|---|---|
| Container da vitrine, do cabeçalho e do rodapé | `mx-auto max-w-site`, dentro de `px-4 sm:px-6 lg:px-8` (até 1340px) |
| Container da administração | `mx-auto max-w-7xl px-4 sm:px-6 lg:px-8` (até 1280px) |
| Bloco de título de seção | até `max-w-3xl` (768px) |
| Texto corrido e formulários | até `max-w-2xl` (672px) |
| Seção da vitrine | `py-section`: 88, 100 (`sm`), 160 (`md`) e 240px (`lg`) |
| Faixa escura das páginas internas | `PageHero`: título com `pt-16 pb-12`, `md:pb-16`, `lg:pt-24 lg:pb-20`; faixa parcial de 128, 192 (`md`) e 240px (`lg`) atrás do começo do conteúdo, que fecha com `pb-section` |
| Telas do cliente | `pt-10 pb-16 md:pt-16 md:pb-24`, até `max-w-3xl` (perfil: `max-w-2xl`); `mt-8` entre o título e o resumo, `mt-10` antes do conteúdo da etapa |
| Card | `p-6 sm:p-8` (vitrine: até `lg:p-10`) |
| Card único de serviços | `px-6 py-12`, `sm:px-10 sm:py-16`, `lg:px-16 lg:py-25.5` (24×48px no celular e 64×102px no desktop, como o Beard X); itens com `gap-x-16 gap-y-12` |
| Grade de cards | `gap-6` (barbeiros: `lg:gap-7`, os 28px do Beard X) |
| Campos de um formulário | `gap-6` entre campos, `gap-2` dentro do campo |
| Ornamento → título | `mt-6` (24px) |

**Breakpoints:** os padrões do Tailwind, `sm` 640, `md` 768, `lg` 1024 e `xl` 1280px. Os do Webflow (479/767/991) não foram adotados: os padrões cobrem os mesmos saltos e evitam configuração própria.

### Forma e elevação

- **Raio 0** em tudo. As exceções são o círculo do logo sobre o escuro e, no futuro, a foto de perfil.
- **Uma sombra só:** `shadow-card`, em superfícies claras sobre `paper`. Modais podem somar uma camada `bg-ink/60` atrás.
- **Bordas:** 1px em campos, chips e cards sem sombra; 2px nos botões; 4px à esquerda nos avisos.
- **Foco:** contorno de 2px na cor da ação (`outline-brand` ou `outline-ink`), com afastamento de 2 a 4px. Nunca remova o foco sem pôr outro no lugar.

### Movimento

As regras completas estão em [identidade-visual.md](identidade-visual.md#movimento). Em resumo: 300ms no hover, 500ms nas entradas. Todo hover (botões, links, chips, campos, cards e a navegação, inclusive na administração) e as entradas usam `ease` (`ease-standard`), como o Beard X; o `ease-out` solto saiu dos componentes na S4.07 (#80). A entrada ao rolar tem três presets em `data-reveal` (`rise`, `fade`, `zoom`; ver a identidade visual) e o `RevealObserver` fica na página que usa o atributo. Tudo respeita `prefers-reduced-motion`, e a área logada não tem entrada animada.

### Ícones e imagens

- **Ícones:** SVG inline próprio, traço de 2px em `currentColor`, tamanho de 16, 20 ou 24px (`size-4`, `size-5`, `size-6`), com `aria-hidden="true"` quando há texto ao lado. Não adotamos biblioteca de ícones por enquanto.
- **Fotos:** sempre `next/image`, com `alt` descritivo (ou `alt=""` se decorativas) e proporção fixa: 6:7 para o card de barbeiro da vitrine (4:5 na administração e no agendamento), 3:2 para o "Sobre" e galeria, e 16:9 para o arquivo de fundo do hero da página inicial, recortado com `object-cover` conforme a tela. O hover das fotos em moldura dá zoom de 1,1 com `overflow-hidden`, em 300ms `ease`, respeitando `prefers-reduced-motion`. Texto sobre foto exige um fundo escuro atrás do próprio texto: `bg-ink/70` no hero e o bloco `ink/80`–`ink/90` do `BarberCard`. No hero, a foto é decorativa, usa `fill`, `sizes="100vw"`, `preload` e `fetchPriority="high"` (o `priority` está obsoleto desde o Next 16); a cascata de entrada fica só no conteúdo. O hero da página inicial tem `min-h-svh`; no desktop, a foto fica numa camada `lg:fixed` recortada pelo `[clip-path:inset(0)]` do hero, e no celular rola junto.
- Ainda não há fotos reais (pendência P10). Até lá, os três proprietários usam **fotos fictícias geradas por IA** como placeholder (D10), em JPEG 4:5: `web/public/images/barbeiros/edvaldo.jpg`, `lauro.jpg` e `manoel.jpg` (S3.10, #63). A D12 estende essa escolha ao hero e ao "Sobre" da página inicial (#72): `web/public/images/vitrine/hero.jpg` (16:9, pelo menos 2400×1350) e `sobre.jpg` (3:2, pelo menos 1800×1200), com até 400 KB cada. As imagens seguem a identidade clássica e sóbria, sem rostos identificáveis, texto ou logotipo. Elas não retratam a Augusto Barbearia nem os proprietários, não vêm de banco de imagem e serão substituídas pelas fotos reais. O barbeiro sem foto continua mostrando um quadro neutro com a inicial. O "Sobre" só mostra sua foto quando o texto estiver preenchido: acima no celular e ao lado no desktop, com o texto fora da imagem. Cards de serviço e heros internos continuam sem foto; galeria, depoimentos e Instagram aguardam material real.

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
| `Ornament`, `SectionHeading` | `ornament.tsx`, `section-heading.tsx` | Pronto |
| `FloatingOrnament` | `floating-ornament.tsx` | Pronto (navalha, tesoura e pente nas bordas das seções, S4.06) |
| `ServiceCard`, `ServiceItem`, `BarberCard`, `BarberPhoto` | `service-card.tsx`, `barber-card.tsx`, `barber-photo.tsx` | Pronto |
| `MobileMenu` | `mobile-menu.tsx` | Pronto |
| `SiteHeader`, `HeaderFrame` | `components/site-header.tsx`, `header-frame.tsx` | Pronto (cabeçalho de todas as páginas) |
| `DayPicker`, `TimePicker` | `components/booking/day-picker.tsx`, `time-picker.tsx` | Pronto (escolha de dia e de horário do agendamento, reaproveitável na remarcação) |
| `ContactNotice` | `components/booking/contact-notice.tsx` | Pronto (aviso de prazo vencido com os contatos da barbearia, RN-14) |
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

- **Texto:** Barlow 900 em caixa alta (18px no `md` a partir de 768px; 16px abaixo; 14px no `sm`).
- **Tamanhos:** `md` (padrão: 60px no celular e 84px a partir do `md`, como o Beard X) e `sm` (44px: administração, cabeçalho, cards e tabelas). Na administração, todos os botões são `sm`. Nas telas do cliente, a ação principal da tela é sempre `md`: "Confirmar agendamento", "Salvar", "Entrar com Google", "Cancelar agendamento" e o botão do estado vazio que faz a pessoa seguir ("Agendar horário", "Escolher outro dia"); as ações dentro de um cartão ("Remarcar", "Cancelar") continuam `sm`.
- **Estados:** hover troca a cor e sobe 3px em 300ms `ease` (o `ghost` sublinha), foco com contorno, `disabled` a 50% e `pending` (trava o botão, mostra um indicador girando e marca `aria-busy`). Use `pending` enquanto uma Server Action roda, com o `useFormStatus` do React.
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
- Os chips-link do agendamento (`TimePicker`, `DayPicker`) têm a mesma borda e o mesmo hover, com o número em Barlow 600 (`font-heading font-semibold`): o horário em 18px, com 44px de altura, e o dia em 24px, num chip de 80px.
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
- Use depois de uma ação ("Seu horário está confirmado."), para um aviso de regra ("Faltam menos de 2 horas.") e para o `message` de erro da API.
- Não há toast. A confirmação aparece na página para onde a ação leva, porque toast some antes de ser lido e se perde no celular.

### Estado vazio

- **`EmptyState`** aparece quando uma lista não tem itens. Ele diz o que aconteceu e oferece o próximo passo: "Você ainda não tem horários" + "Agendar horário".
- Tem fundo `surface` e borda tracejada `ink-muted`, para continuar legível também sobre a faixa escura parcial das páginas internas (S4.07, #80).
- Uma busca ou filtro sem resultado diz o filtro usado e oferece limpar.

### Cards da vitrine

- **`ServiceCard`:** o card branco único dos serviços (S4.06, #79), como o do Beard X: `bg-surface`, `shadow-card` e muito respiro. Recebe a grade de itens (uma `ul` de 1 coluna no celular e 2 a partir de `md`). A página inicial e `/servicos` usam o mesmo card.
- **`ServiceItem`:** um serviço dentro do card. Nome (Barlow 900, caixa alta) e preço em `text-display-4` na mesma linha, sobre um fio `line` (o preço em `brand`, `tabular-nums`); depois a duração, a descrição opcional, "Com <barbeiros>" e o botão "Agendar" (`outline`, `sm`), com o nome do serviço no nome acessível ("Agendar Corte Simples"). Preço e duração levam um prefixo só para leitor de tela ("Preço:", "Duração:").
- **`BarberCard`:** a foto 6:7 com o nome (`text-display-3`, `surface`) e a primeira linha da apresentação (`on-ink-muted`, cortada em uma linha) sobre ela, e "Agendar com <nome>" abaixo (S4.06, #79).
  - O texto fica num bloco `ink/80`–`ink/90` colado à base da foto, com uma faixa de 64px acima que esmaece até a foto. O bloco cresce com o texto, então o contraste passa no AA sobre qualquer foto e com qualquer nome; sem foto, a inicial fica à vista acima dele.
  - Com `fullBio` (`/barbeiros`), a apresentação sai da foto e aparece inteira abaixo dela.
  - O hover do card dá zoom de 1,1 na foto, dentro da moldura.
- **`BarberPhoto`:** a moldura com `next/image`, em 4:5 (padrão, na administração e no agendamento) ou 6:7 (`ratio="6/7"`, no card da vitrine). Sem foto, mostra a inicial do nome (decorativa, `aria-hidden`), num tamanho que acompanha a largura da moldura. Com `zoom`, a foto cresce 10% no hover do card, em 300ms `ease`.
- `ServiceItem` e `BarberCard` recebem o nível do título: `h3` dentro de uma seção com título (página inicial) e `h2` numa página que só tem o `h1` antes (`/servicos`, `/barbeiros`).
- Em grade: barbeiros em 1, 2 (`sm`) e 3 (`lg`) colunas. No `lg`, os cards descem em degraus de 0, 75 e 145px (margem, e não `transform`, que a entrada ao rolar usa) e a grade tem `items-start`, para cada card manter a própria altura. No celular e no tablet, não há degrau.
- Cada item das grades entra com `data-reveal="rise"` e a cascata de `--reveal-index`/`--reveal-cols`.

### Páginas internas da vitrine

- **`PageHero`** (`components/vitrine/page-hero.tsx`) monta o topo de `/servicos` e `/barbeiros` como as páginas internas do Beard X (S4.07, #80): a faixa `ink` com o ornamento, o `h1` em `text-display-1` e o texto de apoio em `text-body`, e logo abaixo uma **faixa escura parcial** que o conteúdo (`children`) atravessa.
- A faixa parcial é uma camada decorativa (`aria-hidden`, `absolute`, `-z-10` dentro de um bloco `relative isolate`) de 128px no celular, 192px a partir do `md` e 240px a partir do `lg`. Ela fica atrás do começo do conteúdo, então o card de serviços e as fotos dos barbeiros começam no escuro e terminam no `paper`.
- Os 240px do desktop passam do maior degrau da equipe (145px): os três cards de barbeiro atravessam a faixa.
- O que pode aparecer sobre a faixa tem fundo próprio: o card de serviços e as fotos, o `Alert` (`surface`) e o `EmptyState` (`surface`).
- O conteúdo do topo entra em cascata como o hero da página inicial: ornamento em 0, título em 200ms e texto em 400ms (`animate-rise`). A faixa parcial não se move.

### Cabeçalho

- **`SiteHeader`** fica no layout raiz e é sempre escuro: o logo no círculo `surface` (o PNG só funciona sobre o claro, P1), o nome em Barlow 900, a navegação em `surface` com o traço `brand` na página atual, a conta (`outline-light` e `ghost-light`) e o "Agendar" (`primary`, `sm`). Tem 80px de altura e segue o container da vitrine.
- **Não é fixo**, como no Beard X: em todas as páginas, ele rola com a página, e quem rola o deixa para trás (decisão de 2026-11-01, #116). Por isso as seções com âncora (`#contato`) não precisam de `scroll-margin`.
- **`HeaderFrame`** decide o modo pela página (`data-mode`), sem depender de JS:

| Modo | Onde | Como fica |
|---|---|---|
| `hero` | Página inicial | Transparente no topo do hero, que é escuro: nunca fica sobre fundo claro |
| `bar` | Todas as outras páginas | Faixa `ink` no topo, contínua com o `PageHero` |

- As telas do cliente (`/agendar`, `/meus-agendamentos`, `/perfil`, `/entrar`) e a administração usam a mesma faixa escura. Ela combina com o rodapé escuro, e o conteúdo claro começa logo abaixo dela; não há variante clara.

### Menu do celular

- **`MobileMenu`** é um `<details>` nativo com o botão "Menu" (ícone e texto, contorno claro). Abaixo de 1024px, ele guarda a navegação, o "Agendar horário" na largura toda e o login; a partir de 1024px, tudo fica na linha do cabeçalho.
- Funciona sem JS. Com JS, fecha com Esc (o foco volta para o botão), ao navegar e ao escolher um link, e abre com a página no topo: como o cabeçalho rola com a página, o painel aberto com ele em parte fora da tela não chegaria ao fim dela.
- O painel é escuro (`ink`) e desce de trás do cabeçalho em 400ms `ease` (`animate-menu-down`), recortado por uma moldura com `overflow-hidden`. Ele ocupa o resto da tela e rola sozinho se o conteúdo não couber. A animação só vale com o menu aberto, para recomeçar a cada abertura; com `prefers-reduced-motion`, ele abre sem animação.
- Aberto, ele trava a rolagem da página pelo CSS (`html:has([data-mobile-menu][open])`, abaixo de 1024px), então isso também funciona sem JS. Sobre o hero, o cabeçalho escurece junto com o painel.
- O link da página atual tem `aria-current="page"` e um traço em `brand`.

### Ornamento e título de seção

- **`Ornament`** é o bigode entre duas linhas, sempre `aria-hidden`. Só na vitrine e no estado vazio.
- **`SectionHeading`** junta o ornamento, o título `h2` e o texto de apoio, alinhado ao centro ou à esquerda, com tom claro ou escuro.
- **`FloatingOrnament`** (S4.06, #79) é um desenho grande de traço próprio, que flutua na borda de uma seção da vitrine, como os do Beard X: `razor` (navalha), `scissors` (tesoura) ou `comb` (pente).
  - Só traço de 2px em `currentColor`, `text-ink/10` sobre `paper` e `surface`, com menos de 1 KB cada. Nada vem do template.
  - É decoração: `aria-hidden`, `pointer-events-none` e `data-reveal="fade"`. Fica atrás do conteúdo com `-z-10`.
  - A seção que o recebe precisa de `relative isolate overflow-hidden`: o `isolate` põe o `-z-10` entre o fundo e o conteúdo, e o `overflow-hidden` recorta o que passa da borda, sem rolagem horizontal.
  - Posição e tamanho vêm por `className`, sem `transform` (a entrada ao rolar o usa).
  - Só aparece a partir do `lg`: no celular e no tablet, o texto ocupa a largura toda e não sobra borda para decorar.
  - Na página inicial: navalha no "Sobre", tesoura nos serviços e pente na equipe. Uma seção, um ornamento.

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
- **Sem a faixa escura parcial** (S4.07, #80). A moldura (`BookingMain`) fica em `paper`, logo abaixo da faixa escura do cabeçalho. O fluxo segue o Squire, e não as páginas internas do Beard X; no celular, uma faixa a mais em cada uma das 5 etapas empurraria as opções para fora da primeira tela; e o cabeçalho escuro já faz a ligação com a vitrine. A mesma moldura serve a remarcação, "Meus agendamentos" e o cancelamento.
- **Cada escolha é um link:** um toque avança, sem botão "Continuar" e sem barra fixa no rodapé. Funciona sem JS.
- Barbeiro em cards com a foto (2 colunas no celular); serviço em cards com duração e preço (uma coluna). Dia com `DayPicker`: só os dias com horário, agrupados por mês, 3 por linha no celular. Horário com `TimePicker`: chips-link com a cara do `ChoiceChip`, agrupados em Manhã e Tarde, 3 por linha no celular. O `ChoiceChip` (`radio`) continua para formulários, como a forma de pagamento.
- A confirmação mostra o resumo completo, o aviso das 2h (D6) num `Alert` `info`, o campo Telefone quando o perfil não tem, e o botão "Confirmar agendamento". Depois de confirmar, a mesma página mostra "Horário confirmado", o resumo e "Ver meus agendamentos".
- **Remarcação** ([spec](../specs/meus-agendamentos.md)): o mesmo padrão em 4 etapas (barbeiro → dia → horário → confirmar), com o horário atual no topo do resumo. Entra pelo dia, com o barbeiro atual já escolhido; o "Trocar" do barbeiro volta à etapa de barbeiro.

### Meus agendamentos

- Um cartão por agendamento, em "Próximos" e "Histórico": serviço (`h3`), `StatusBadge`, dia, horário, barbeiro e valor. Um `SCHEDULED` que já passou mostra o `Badge` `muted` "Aguardando registro".
- As ações "Remarcar" (`outline`, `sm`) e "Cancelar" (`danger`, `sm`) aparecem só quando a API diz que pode (`can_reschedule`, `can_cancel`), com o prazo por extenso acima. O nome acessível inclui a data ("Cancelar o horário de terça-feira, 3 de novembro de 2026").
- Sem as ações, o próximo horário mostra o `ContactNotice`: o aviso das 2 horas em `warning`, com os links de contato.
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
| Fonte dos títulos | **Decidido em 2026-10-31 e em uso desde a S4.03 (#76):** Barlow 900 em caixa alta, como o Beard X ([identidade-visual.md](identidade-visual.md#tipografia)) | Playfair Display 700, que conversava com o "A" serifado do logo |
| Cor de acento | O vermelho da marca, que substitui o champanhe do Beard X | Um segundo acento quente para detalhes |
| Breakpoints | Padrões do Tailwind | Os do Webflow (479/767/991) |

## Como evoluir

1. Antes de criar um componente, veja se um existente resolve com uma variante.
2. Componente novo: entra em `web/src/components/ui`, na tabela acima, na página `/design-system` e ganha teste.
3. Token novo: entra em `globals.css`, em [identidade-visual.md](identidade-visual.md) (com o contraste, se for cor) e aqui, com o papel dele.
4. Mudou uma regra deste documento? Atualize no mesmo PR que muda o código.
