# Identidade visual

> Este documento cuida da **marca**: logo, cores, fontes, tom, linguagem e movimento. Os componentes e os padrões de tela estão no [design system](design-system.md).

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
| Títulos | **Playfair Display** (Google Fonts), 700 | Títulos da vitrine e nomes de seção. Conversa com o "A" serifado do logo |
| Texto e interface | **Inter** (Google Fonts), 400/500/600 | Todo o resto: formulários, tabelas, botões, administração |

- O texto usa a escala padrão do Tailwind, com base de 16px.
- Os títulos da vitrine usam uma escala própria, que cresce com a tela (`clamp`):

| Token | Celular → desktop | Uso |
|---|---|---|
| `text-display-1` | 40 → 72px | Título do hero |
| `text-display-2` | 32 → 48px | Título de seção |
| `text-display-3` | 24 → 32px | Destaques e números |

- Botões, rótulos e textos pequenos em destaque usam Inter 600 em **caixa alta com espaçamento de 0,08em**.
- Na administração, os títulos também usam Inter: lá a prioridade é densidade e leitura rápida.

## Tom

- **Visual:** clássico e sóbrio, com cara de barbearia tradicional e sem exagero. A vitrine tem mais respiro e fotos; a administração é limpa e direta.
- **Texto:** próximo e simples, tratando o cliente por "você". Frases curtas. Nada de jargão técnico em mensagens de erro: a mensagem diz o que aconteceu e o que fazer.
  - ✅ "Esse horário acabou de ser reservado. Escolha outro."
  - ❌ "Erro 409: conflito de agendamento."

## Linguagem visual

A estrutura e o ritmo vêm da referência [Beard X](referencia-beard-x.md), adaptados às cores e às fontes acima.

- **Formas quadradas:** botões, cards e campos não têm arredondamento. A exceção é o círculo claro que segura o logo em fundo escuro.
- **Faixas escuras e claras:** o hero e o rodapé ficam em `ink`; as seções, em `paper`, com cards em `surface`.
- **Ornamento:** um bigode entre duas linhas, em `brand` (`brand-on-dark` sobre o escuro), fica 24px acima dos títulos de seção, no lugar de um texto pequeno.
- **Elevação mínima:** uma única sombra, `shadow-card` (`0 2px 12px` a 8%), nos cards claros.
- **Botões:** primário em `brand` com texto branco, contorno em `ink` e contorno claro sobre o escuro. Altura mínima de 56px, caixa alta e anel de foco visível.
- **Cabeçalho:** claro e fixo no topo (`sticky`), porque o logo só funciona sobre fundo claro e o botão de agendar precisa ficar sempre à mão.
- **Respiro:** seções com 80px de padding vertical no celular e 128px no desktop; conteúdo em até 1280px.

## Movimento

- Tudo dura **300ms** (hover) ou **500ms** (entradas), com `ease-out`.
- **Hover:** botões trocam de cor e sobem 2px. Fotos em cards dão um zoom de 1,05 dentro da moldura.
- **Hero:** o conteúdo sobe e aparece em cascata ao carregar, com delays de 0, 80, 160 e 240ms. É só CSS, e o cabeçalho nunca anima.
- **Entrada ao rolar:** elementos com `data-reveal` sobem 24px e aparecem uma única vez (componente `RevealObserver`). Só o que está abaixo da dobra começa escondido. A página que usa `data-reveal` monta o próprio `RevealObserver`; no layout, ele mexeria nos elementos antes de a página hidratar.
- **Regras:**
  - Todo movimento respeita `prefers-reduced-motion`.
  - Nenhum conteúdo depende de JavaScript para aparecer.
  - Nada de parallax, loader ou autoplay.

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
