# Identidade visual

> Este documento cuida da **marca**: logo, cores, fontes, tom, linguagem e movimento. Os componentes e os padrões de tela estão no [design system](design-system.md).

> **Decisão de 2026-11-10 (#196):** os títulos passam a usar a **Libre Caslon Text** (Google Fonts, 400/700), em **maiúsculas e minúsculas** e peso normal, a serifada livre mais próxima do logo que a barbearia usa no Instagram. A Barlow 900 em caixa alta fica só nos botões. O resto da marca não muda. Onde as decisões abaixo falam de títulos em Barlow, vale esta.

> **Decisão de 2026-11-06 (redesign Hallmark):** o dono do projeto aprovou o redesign feito com o Hallmark, que substitui a aproximação ao Beard X na **composição** da vitrine. A marca fica: o vermelho `brand`, Barlow 900 em caixa alta, Inter, o logo e as formas quadradas. Mudam a disposição das seções, o ritmo, os botões, os rótulos e o movimento, descritos abaixo. As medições do Beard X continuam em [referencia-beard-x.md](referencia-beard-x.md) como histórico.

> **Decisão de 2026-10-31 (Sprint 4):** a vitrine se aproxima do [Beard X](referencia-beard-x.md) medido ao vivo. Os títulos passam a ser **Barlow 900 em caixa alta** (no lugar da Playfair Display), o acento continua o **vermelho `brand`** (não o champanhe do Beard X) e o **fundo fixo do hero vale só no desktop**. A fonte, a escala dos títulos, o corpo, o respiro e o botão entraram na S4.03 (#76). O cabeçalho e o hero entraram na S4.04 (#77), e a entrada ao rolar, na S4.05 (#78). Serviços, equipe e ornamentos vieram na S4.06 (#79), e as páginas internas e as telas do cliente fecharam a sprint na S4.07 (#80).

> **Status:** proposta para o MVP. As cores e o logo vieram do projeto acadêmico, que usou o material entregue pela barbearia ("cores baseadas no cartão"). O logo em vetor e a confirmação da paleta são as pendências P1 e P2 em [registro.md](../cliente/registro.md). O protótipo aprovado no Figma ainda não está acessível (P6).

## Logo

![Logo Augusto Barbearia](assets/logo.png)

- Arquivo: [`assets/logo.png`](assets/logo.png), PNG 500×500 com fundo transparente, tirado do repositório antigo.
- Elementos: um "A" serifado com bigode, sobre um poste de barbeiro listrado em vermelho e branco.
- **Uso:** sempre sobre fundo claro. Os traços pretos somem em fundo escuro. Até existir uma versão negativa, nas áreas escuras o logo vai dentro de um círculo ou cartão claro.
- **Pendente (P1):** a versão em vetor (SVG). Quando chegar, substitui o PNG e ganha uma versão negativa.

## Cores

A paleta tem preto, branco e vermelho. O vermelho vivo do logo (`#FF3131`) **não** é usado em texto ou botão, porque tem contraste baixo. A interface usa um vermelho mais fechado, que passa no WCAG AA.

Desde o redesign de 2026-11-06, os tokens ficam em **OKLCH** no código, com os mesmos papéis. Os neutros puxam para o tom quente do papel (nada de preto ou branco puros), e entrou o `paper-2`, um papel um degrau mais escuro para a seção "Como funciona". Os hex da tabela são a referência de cada cor; o valor exato está em `web/src/app/globals.css`.

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `brand` | `#C41E3A` | Botões primários, links, destaques | 5,8:1 com branco ✅ |
| `brand-strong` | `#8B1528` | Hover e pressionado do primário | 9,4:1 com branco ✅ |
| `brand-on-dark` | `#E63946` | Destaque sobre fundo escuro | 4,5:1 sobre `#111111` ✅ |
| `logo-red` | `#FF3131` | **Só** no logo e em ilustrações | — |
| `ink` | `#111111` | Texto principal; fundos escuros (hero, rodapé) | 17,7:1 sobre `paper` ✅ |
| `ink-muted` | `#5C5C5C` | Texto secundário | 6,3:1 sobre `paper` ✅ |
| `paper` | `#FAF7F2` | Fundo das páginas (off-white quente) | — |
| `paper-2` | `oklch(94.2% 0.013 75)` | Papel um degrau mais escuro ("Como funciona") | — |
| `surface` | `#FFFFFF` (no código, `oklch(99.2% 0.004 75)`, um branco quente) | Cartões, modais, campos | — |
| `line` | `#E5E1DA` | Bordas e divisores | — |
| `on-ink-muted` | `#BDB8B0` | Texto secundário sobre fundo escuro (`ink`) | 9,6:1 sobre `#111111` ✅ |
| `line-on-ink` | `#333333` | Divisores sobre fundo escuro | — |
| `success` | `#1E7F4F` | Concluído, confirmações | 5,0:1 com branco ✅ |
| `warning` | `#9A5B00` | Avisos (ex.: "faltam menos de 2h") | 5,4:1 com branco ✅ |
| `danger` | `#B42318` | Cancelado, erro, falta | 6,6:1 com branco ✅ |

**Status do agendamento** (badges): `AGENDADO` em `ink` sobre `line`, `CONCLUIDO` em `success`, `CANCELADO` em `ink-muted` riscado, `FALTOU` em `danger`.

## Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Títulos da vitrine | **Libre Caslon Text** (Google Fonts), 400 em **maiúsculas e minúsculas** (700 para números menores) | Títulos do hero e das seções, nome no cabeçalho e no rodapé, nomes em cards, preços e números. Desde a #196, no lugar da Barlow 900 em caixa alta, para ficar parecida com o logo |
| Botões | **Barlow** (Google Fonts), 900 em **caixa alta** | Só os botões (`Button` e os botões de conclusão da agenda) |
| Texto e interface | **Inter** (Google Fonts), 400/500/600 | Todo o resto: formulários, tabelas, botões de apoio, administração |

- O corpo da vitrine (`text-body`) tem **17px com entrelinha de 1,6** a partir do `md` e 16px com entrelinha de 1,55 no celular. O texto de apoio logo abaixo de um título grande usa `text-lead` (18 a 22px). Na administração, o texto segue a escala padrão do Tailwind, com base de 16px.
- Os títulos da vitrine usam uma escala própria, que cresce com a tela (`clamp`) de 360 a 1440px. Com minúsculas, a entrelinha deixa espaço para as descendentes (g, p) da linha de cima: nunca fica abaixo de 1,08. O hero da página inicial tem o próprio passo, `text-display-hero`, preso em 132px a partir de 1440px:

| Token | Celular → desktop | Entrelinha | Uso |
|---|---|---|---|
| `text-display-hero` | 48 → 132px | 1,08 | Nome da barbearia no hero da página inicial |
| `text-display-1` | 40 → 84px | 1,1 | Título das páginas internas, a faixa "Agende pelo celular" e o nome no rodapé |
| `text-display-2` | 32 → 56px | 1,12 | Título de seção e numeral dos passos |
| `text-display-3` | 24 → 38px | 1,18 | Nome do serviço e preço na tabela, nome do barbeiro; título das telas do cliente |
| `text-display-4` | 20 → 24px | 1,25 | Passos de "Como funciona", horários no quadro de contato, títulos pequenos de bloco e estado vazio |

- Os títulos são em **maiúsculas e minúsculas**, como o logo, em Libre Caslon Text 400 (`font-normal`), sem `uppercase`. O negrito (700, `font-semibold` ou `font-bold`) fica para números menores, como o dia no `DayPicker`. Em 360px, confira a quebra de linha: palavra longa não pode estourar a tela.
- Botões em Barlow 900 em caixa alta, com espaçamento de 0,02em. Rótulos, legendas, badges e textos pequenos em destaque usam Inter 600 em `text-sm` (14px), em caixa normal e **sem** espaçamento extra: a caixa alta espaçada saiu de toda a interface no redesign de 2026-11-06.
- Na administração, os títulos continuam em Inter: lá a prioridade é densidade e leitura rápida.

## Tom

- **Visual:** clássico e sóbrio, com cara de barbearia tradicional e sem exagero. A vitrine tem mais respiro e fotos; a administração é limpa e direta.
- **Texto:** próximo e simples, tratando o cliente por "você". Frases curtas. Nada de jargão técnico em mensagens de erro: a mensagem diz o que aconteceu e o que fazer.
  - ✅ "Esse horário acabou de ser reservado. Escolha outro."
  - ❌ "Erro 409: conflito de agendamento."

## Linguagem visual

Desde o redesign de 2026-11-06, a composição da vitrine é a do Hallmark, sobre a marca acima. Cada seção tem uma ideia, em tamanho grande, e as vizinhas não repetem a mesma estrutura. Os títulos ficam à esquerda, e o acento vermelho é um sinal (botão primário, numeral, foco), não um fundo.

- **Formas quadradas:** botões, cards e campos não têm arredondamento. A exceção é o círculo claro que segura o logo em fundo escuro.
- **Faixas escuras e claras:** o hero, a faixa "Agende pelo celular", o contato e o rodapé ficam em `ink`; as seções, em `paper` ou `surface`, e "Como funciona" em `paper-2`. Em `/barbeiros`, a faixa escura do título continua numa faixa parcial que as fotos da equipe atravessam (S4.07, #80). Em `/servicos`, a tabela de preços começa abaixo da faixa escura, sem faixa parcial, porque é texto escuro sobre o papel. As telas do cliente e da administração não têm essa faixa: o conteúdo claro começa logo abaixo do cabeçalho escuro.
- **Ornamento:** o bigode entre duas linhas, em `brand-on-dark`, fica só no hero da página inicial, como marca, acima do nome. Os títulos de seção abrem sozinhos, sem ornamento nem rótulo acima. Os desenhos que flutuavam nas bordas das seções (navalha, tesoura e pente) saíram da vitrine no redesign: ilustração desenhada não entra.
- **Hero:** ocupa a tela inteira (`min-h-svh`), na postura *Ledge*: o nome descansa embaixo, à esquerda, com a frase e os botões. Um degradê de `ink` (`bg-linear-to-tr`, de 90% a 15%) escurece só o lado do texto, no lugar do véu de 70% sobre a foto inteira. No desktop, a foto fica fixa enquanto a página rola; no celular, ela rola junto (S4.04, #77). A foto fixa é uma camada `fixed` recortada pelo `clip-path` do hero, e não `background-attachment: fixed`, que o Safari ignora.
- **Elevação mínima:** a vitrine separa por filetes e por troca de papel, sem cards. A sombra `shadow-card` ficou só um filete de 1px a 5%, para os cards que restam na área logada. As fotos levam um contorno interno de `ink` a 10%.
- **Botões:** primário em `brand` com texto branco, contorno em `ink` e contorno claro sobre o escuro. Caixa alta, sem quebra de linha e anel de foco visível. O `md` tem **52px** em todas as telas, com largura total no celular; o `sm` (44px) fica para a administração, o cabeçalho e as linhas de serviço e de barbeiro. O hover só troca a cor (o botão não sobe mais), e o pressionado escurece um degrau (`active:`).
- **Cabeçalho** (S4.04, #77): sempre escuro, com o logo no círculo claro, o nome em Libre Caslon Text, em maiúsculas e minúsculas, e 80px de altura.
  - Não é fixo: rola com a página, como no Beard X (decisão de 2026-11-01, #116, que substitui a faixa fixa da S4.04).
  - Na página inicial, fica transparente no topo do hero. Ele nunca fica transparente sobre fundo claro.
  - Nas outras páginas, é uma faixa `ink` no topo, contínua com a faixa escura do `PageHero`. As telas do cliente e da administração usam a mesma faixa: ela combina com o rodapé escuro e não disputa com o conteúdo claro.
- **Respiro:** as seções da vitrine (`py-section`) têm 72px de padding vertical no celular, 88px a partir do `sm`, 120px a partir do `md` e 144px a partir do `lg`. As seções de respiro maior (serviços e "Como funciona") usam `py-section-l`: 96, 112, 144 e 176px. O conteúdo vai até 1340px (`max-w-site`); em telas maiores, crescem as margens. O cabeçalho e o rodapé seguem o mesmo container desde a S4.04 (#77); a administração continua com 1280px.

## Movimento

Desde o redesign de 2026-11-06, o movimento é curto e de uma família só: chegadas desaceleram (`ease-standard`, `cubic-bezier(0.16, 1, 0.3, 1)`), e nunca se usa o `ease` do navegador.

| | Em uso |
|---|---|
| Hover de botão | Só troca a cor, em 200ms. O botão não sobe |
| Pressionado | Um degrau mais escuro (`active:`), em todos os botões e links da vitrine |
| Hover de links, chips, campos e cards | Troca de cor em `ease-standard` |
| Foto em moldura | Parada: sem zoom no hover |
| Cascata do hero e das páginas internas | Ornamento, título, texto e botões em 0, 80, 160 e 240ms, 600ms cada |
| Entrada ao rolar | Um só movimento: sobe 8px e aparece em 420ms, atraso padrão de 120ms, cascata de 40ms por coluna nas grades e disparo antecipado em 96px (#90) |
| Menu do celular | Painel escuro que desce em 420ms (S4.04) |

- **Entrada ao rolar** (componente `RevealObserver`, uma única vez por elemento):
  - os valores de `data-reveal` (`rise`, `fade`, `zoom`, ou sem valor) continuam aceitos, mas `rise` e `zoom` fazem o mesmo movimento (sobe 8px); `fade` só aparece;
  - `data-reveal-delay="400"` (em ms) troca o atraso daquele elemento (o observer grava `--reveal-delay`);
  - o estado vai em outro atributo, `data-reveal-state` (`pending` ou `done`), que só o observer escreve. O servidor nunca o renderiza;
  - o CSS só esconde o `pending` sob a classe `.js`, que o observer põe no `<html>`. Sem JavaScript, nada fica escondido;
  - a transição só existe no `done`: esconder é instantâneo e fica abaixo da dobra;
  - o bloco de título (`SectionHeading`) anima como uma unidade, com um `data-reveal="rise"` em volta;
  - o observer usa `threshold: 0` e margem inferior positiva de **96px**;
  - nas grades (`catalog.tsx`), cada card recebe `--reveal-index` e a `ul` define `--reveal-cols` por breakpoint; o CSS soma **40ms por coluna** ao atraso. No celular, com 1 coluna, não há degrau.
- **Hero:** o conteúdo sobe 8px e aparece em cascata ao carregar (`animate-rise`). É só CSS, e a cascata não esconde nada antes do JS. O cabeçalho não anima nem fica fixo: rola com a página.
- **Escondido só abaixo da dobra:** só o que está abaixo da dobra começa escondido. A página que usa `data-reveal` monta o próprio `RevealObserver`; no layout, ele mexeria nos elementos antes de a página hidratar.
- **Rolagem:** a nativa do navegador. No desktop, a foto do hero fica fixa com CSS, sem parallax por script.

### Medição da entrada dos cards (#90)

Chrome headless, página inicial com os três barbeiros, altura de viewport de 900px e rolagem constante de 600px/s. Mediu-se da entrada do topo da caixa sem o deslocamento do `rise` na viewport até a opacidade superar 0,01. A configuração anterior (`threshold: 0.15`, margem inferior `-10%`, cascata de 200ms) foi reproduzida na mesma página para comparação. Valores arredondados, sujeitos ao intervalo de um frame:

| Largura | Altura do card | Antes: tempo invisível (1º / 2º / 3º) | Depois: tempo invisível (1º / 2º / 3º) |
|---|---|---|---|
| 375px | 468px | 583 / 567 / 583ms | 167 / 233 / 150ms |
| 1440px | 567px | 617 / 833 / 1033ms | 183 / 233 / 283ms |

Nas duas larguras, sem JavaScript e com `prefers-reduced-motion: reduce`, nenhum elemento de entrada fica escondido, não há rolagem horizontal nem erro de hidratação. A medição é de antes do redesign, com 500ms de duração; o redesign encurtou a duração e o atraso, e o disparo continua o mesmo.

### Garantias de movimento

- **Regras:**
  - Todo movimento respeita `prefers-reduced-motion`.
  - Nenhum conteúdo depende de JavaScript para aparecer.
  - Nada de parallax por script, loader ou autoplay. O Beard X deixa 34 elementos com `opacity: 0` no HTML; nós não fazemos isso.

## Tokens para o código

No Next.js, as cores viram variáveis CSS mapeadas no tema do Tailwind. Desde o redesign, o código as declara em OKLCH; os hex abaixo são a referência de cada uma:

```css
:root {
  --brand: #C41E3A;
  --brand-strong: #8B1528;
  --brand-on-dark: #E63946;
  --logo-red: #FF3131;
  --ink: #111111;
  --ink-muted: #5C5C5C;
  --paper: #FAF7F2;
  --surface: #FFFFFF;
  --line: #E5E1DA;
  --on-ink-muted: #BDB8B0;
  --line-on-ink: #333333;
  --success: #1E7F4F;
  --warning: #9A5B00;
  --danger: #B42318;
}
```

Além das cores, `globals.css` define os tokens de ritmo e tipografia da vitrine:

| Classe | Token | Valor |
|---|---|---|
| `font-heading` | `--font-heading` | Libre Caslon Text (400 e 700), pela variável `--font-caslon` do `next/font` |
| `font-button` | `--font-button` | Barlow 900, pela variável `--font-barlow` do `next/font`. Só nos botões |
| `text-display-hero`, `text-display-1` a `text-display-4` | `--text-display-*` | `clamp` de 360 a 1440px, entrelinha de 1,08 a 1,25 |
| `text-lead` | `--text-lead` | 18 a 22px, entrelinha 1,45 |
| `text-body` | `--body-size`, `--body-leading` | 16px/1,55; 17px/1,6 a partir do `md` |
| `py-section` | `--section-y` | 72, 88, 120 e 144px (base, `sm`, `md`, `lg`) |
| `py-section-l` | `--section-y-l` | 96, 112, 144 e 176px |
| `bg-paper-2` | `--paper-2` | papel um degrau mais escuro |
| `max-w-site` | `--container-site` | 1340px |
| `ease-standard` | `--ease-standard` | `cubic-bezier(0.16, 1, 0.3, 1)` |

Os papéis do Hallmark apontam para os tokens do projeto no `@theme`: `--color-accent` e `--color-focus` são o `brand`, `--color-muted` é o `ink-muted`, `--color-rule` é o `line`, `--font-display` é a Libre Caslon Text e `--font-body` é a Inter. As regras de base que o Hallmark exige (`overflow-x: clip`, foco visível, quebra dos títulos, menos movimento) estão em `web/src/app/base.css`. O topo do `globals.css` traz o carimbo do Hallmark com as decisões e as dispensas registradas.

O componente usa sempre o token (`bg-brand`, `text-ink`, `text-display-2`, `py-section`, `shadow-card`), nunca o hex direto. Os tokens estão em `web/src/app/globals.css`.

## Telas

O protótipo aprovado no Figma (2025) ainda não está acessível (P6). Até lá, as telas seguem os fluxos descritos nas specs (`docs/specs/`) e o mapa de páginas em [arquitetura.md](../arquitetura.md#web-web). Quando o acesso ao Figma for recuperado, o link entra aqui.
