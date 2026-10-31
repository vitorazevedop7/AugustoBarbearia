# Identidade visual

> Este documento cuida da **marca**: logo, cores, fontes, tom, linguagem e movimento. Os componentes e os padrões de tela estão no [design system](design-system.md).

> **Decisão de 2026-10-31 (Sprint 4):** a vitrine se aproxima do [Beard X](referencia-beard-x.md) medido ao vivo. Os títulos passam a ser **Barlow 900 em caixa alta** (no lugar da Playfair Display), o acento continua o **vermelho `brand`** (não o champanhe do Beard X) e o **fundo fixo do hero vale só no desktop**. Este documento já descreve a decisão, mas **os tokens e o código só mudam na S4.03 (#76)**; o movimento, na S4.05 (#78), e o cabeçalho e o hero, na S4.04 (#77). Até lá, o código ainda usa Playfair Display 700, `text-display-1` de 40 a 72px, `text-display-2` de 32 a 48px, `text-display-3` de 24 a 32px e o corpo de 16px; a seção Tipografia já descreve o alvo.

> **Status:** proposta para o MVP. As cores e o logo vieram do projeto acadêmico, que usou o material entregue pela barbearia ("cores baseadas no cartão"). O logo em vetor e a confirmação da paleta são as pendências P1 e P2 em [registro.md](../cliente/registro.md). O protótipo aprovado no Figma ainda não está acessível (P6).

## Logo

![Logo Augusto Barbearia](assets/logo.png)

- Arquivo: [`assets/logo.png`](assets/logo.png), PNG 500×500 com fundo transparente, tirado do repositório antigo.
- Elementos: um "A" serifado com bigode, sobre um poste de barbeiro listrado em vermelho e branco.
- **Uso:** sempre sobre fundo claro. Os traços pretos somem em fundo escuro. Até existir uma versão negativa, nas áreas escuras o logo vai dentro de um círculo ou cartão claro.
- **Pendente (P1):** a versão em vetor (SVG). Quando chegar, substitui o PNG e ganha uma versão negativa.

## Cores

A paleta tem preto, branco e vermelho. O vermelho vivo do logo (`#FF3131`) **não** é usado em texto ou botão, porque tem contraste baixo. A interface usa um vermelho mais fechado, que passa no WCAG AA.

| Token | Hex | Uso | Contraste |
|---|---|---|---|
| `brand` | `#C41E3A` | Botões primários, links, destaques | 5,8:1 com branco ✅ |
| `brand-strong` | `#8B1528` | Hover e pressionado do primário | 9,4:1 com branco ✅ |
| `brand-on-dark` | `#E63946` | Destaque sobre fundo escuro | 4,5:1 sobre `#111111` ✅ |
| `logo-red` | `#FF3131` | **Só** no logo e em ilustrações | — |
| `ink` | `#111111` | Texto principal; fundos escuros (hero, rodapé) | 17,7:1 sobre `paper` ✅ |
| `ink-muted` | `#5C5C5C` | Texto secundário | 6,3:1 sobre `paper` ✅ |
| `paper` | `#FAF7F2` | Fundo das páginas (off-white quente) | — |
| `surface` | `#FFFFFF` | Cartões, modais, campos | — |
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
| Títulos da vitrine | **Barlow** (Google Fonts), 900 em **caixa alta** (600 para títulos menores) | Títulos do hero e das seções, nomes em cards e números. Substitui a Playfair Display, que ficava com 700 e sem caixa alta |
| Texto e interface | **Inter** (Google Fonts), 400/500/600 | Todo o resto: formulários, tabelas, botões de apoio, administração |

- O corpo da vitrine tem **18px com entrelinha de 1,667** a partir do `md` e 16px no celular. Na administração, o texto segue a escala padrão do Tailwind, com base de 16px.
- Os títulos da vitrine usam uma escala própria, que cresce com a tela (`clamp`). Os valores vêm da medição do Beard X:

| Token | Celular → desktop | Uso |
|---|---|---|
| `text-display-1` | 32 → 92px (40 e 64px nos tamanhos intermediários) | Título do hero |
| `text-display-2` | 28 → 56px (34px no intermediário) | Título de seção |
| `text-display-3` | 24 → 38px | Nomes em cards, destaques e números |
| `text-display-4` | 20 → 24px | Títulos pequenos de bloco |

- Os títulos são sempre em **caixa alta**. Em 360px, confira a quebra de linha: palavra longa não pode estourar a tela.
- Botões em Barlow 900 em caixa alta. Rótulos e textos pequenos em destaque usam Inter 600 em caixa alta com espaçamento de 0,08em.
- Na administração, os títulos continuam em Inter: lá a prioridade é densidade e leitura rápida.
- A `display-3` e a `display-4` vêm da análise anterior do Beard X e não foram medidas de novo. A S4.03 confirma os valores.

## Tom

- **Visual:** clássico e sóbrio, com cara de barbearia tradicional e sem exagero. A vitrine tem mais respiro e fotos; a administração é limpa e direta.
- **Texto:** próximo e simples, tratando o cliente por "você". Frases curtas. Nada de jargão técnico em mensagens de erro: a mensagem diz o que aconteceu e o que fazer.
  - ✅ "Esse horário acabou de ser reservado. Escolha outro."
  - ❌ "Erro 409: conflito de agendamento."

## Linguagem visual

A estrutura e o ritmo vêm da referência [Beard X](referencia-beard-x.md), medida ao vivo, adaptados às cores e às fontes acima. O acento é o vermelho `brand`, e não o champanhe do Beard X. Só reproduzimos estrutura, proporções e padrões de interação; textos, imagens, ícones e código do template ficam de fora.

- **Formas quadradas:** botões, cards e campos não têm arredondamento. A exceção é o círculo claro que segura o logo em fundo escuro.
- **Faixas escuras e claras:** o hero e o rodapé ficam em `ink`; as seções, em `paper`, com cards em `surface`.
- **Ornamento:** um bigode entre duas linhas, em `brand` (`brand-on-dark` sobre o escuro), fica 24px acima dos títulos de seção, no lugar de um texto pequeno. Ornamentos SVG maiores, próprios e decorativos, flutuam nas bordas das seções, atrás do conteúdo (S4.06, #79).
- **Hero:** ocupa a tela inteira, com overlay preto de 70%. No desktop, a foto fica fixa enquanto a página rola; no celular, ela rola junto (S4.04, #77).
- **Elevação mínima:** uma única sombra, `shadow-card` (`0 2px 12px` a 8%), nos cards claros.
- **Botões:** primário em `brand` com texto branco, contorno em `ink` e contorno claro sobre o escuro. Caixa alta e anel de foco visível. Hoje a altura mínima é de 56px; na S4.03 (#76) passa a **84px no desktop**, com largura total no celular.
- **Cabeçalho:** hoje é claro e fixo no topo (`sticky`), porque o logo só funciona sobre fundo claro e o botão de agendar precisa ficar sempre à mão. Na S4.04 (#77) ele passa a ficar transparente dentro do hero, com o logo no círculo claro, e vira uma faixa escura fixa ao rolar além do hero.
- **Respiro:** hoje as seções têm 80px de padding vertical no celular e 128px no desktop, com conteúdo em até 1280px. Na S4.03 (#76) passam a 88px no celular e 240px no desktop, com container de até 1340px.

## Movimento

Hoje o código faz o que está em "Em uso". A coluna "Alvo" é a decisão medida no Beard X, que a S4.05 (#78) e a S4.03 (#76) aplicam.

| | Em uso | Alvo (Beard X) |
|---|---|---|
| Hover de botão | Troca de cor e sobe 2px, 300ms `ease-out` | Troca de cor e sobe 3px, 300ms `ease` |
| Zoom de foto em card | 1,05 | 1,1, dentro de uma moldura com `overflow: hidden` |
| Entrada ao rolar | Um preset: sobe 24px fixos e aparece, 500ms `ease-out` | Três presets (`rise`, `fade`, `zoom`), 500ms `ease`, atraso padrão de 200ms |
| Menu do celular | Abre sem animação | Painel escuro que desce em 400ms `ease` |

- **Presets de entrada** (componente `RevealObserver`, uma única vez por elemento):
  - `rise`: sobe **10% da altura do elemento** e aparece;
  - `fade`: só aparece;
  - `zoom`: vai de 0,92 a 1 de escala enquanto aparece;
  - o atraso é definido por atributo, de 0,2 a 0,6s. O bloco de título (ornamento, título e texto) anima como uma unidade, e as grades entram em cascata de 200ms.
- **Hero:** o conteúdo sobe e aparece em cascata ao carregar, com delays de 0, 80, 160 e 240ms hoje. É só CSS, e a cascata não esconde nada antes do JS. A S4.05 alinha o ritmo ao do preset. O cabeçalho nunca anima.
- **Escondido só abaixo da dobra:** só o que está abaixo da dobra começa escondido. A página que usa `data-reveal` monta o próprio `RevealObserver`; no layout, ele mexeria nos elementos antes de a página hidratar.
- **Rolagem:** a nativa do navegador. No desktop, a foto do hero fica fixa com CSS, sem parallax por script.
- **Regras:**
  - Todo movimento respeita `prefers-reduced-motion`.
  - Nenhum conteúdo depende de JavaScript para aparecer.
  - Nada de parallax por script, loader ou autoplay. O Beard X deixa 34 elementos com `opacity: 0` no HTML; nós não fazemos isso.

## Tokens para o código

No Next.js, as cores viram variáveis CSS mapeadas no tema do Tailwind:

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

O componente usa sempre o token (`bg-brand`, `text-ink`, `text-display-2`, `shadow-card`), nunca o hex direto. Os tokens estão em `web/src/app/globals.css`.

## Telas

O protótipo aprovado no Figma (2025) ainda não está acessível (P6). Até lá, as telas seguem os fluxos descritos nas specs (`docs/specs/`) e o mapa de páginas em [arquitetura.md](../arquitetura.md#web-web). Quando o acesso ao Figma for recuperado, o link entra aqui.
