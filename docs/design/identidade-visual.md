# Identidade visual

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
| `success` | `#1E7F4F` | Concluído, confirmações | 5,0:1 com branco ✅ |
| `warning` | `#9A5B00` | Avisos (ex.: "faltam menos de 2h") | 5,4:1 com branco ✅ |
| `danger` | `#B42318` | Cancelado, erro, falta | 6,6:1 com branco ✅ |

**Status do agendamento** (badges): `AGENDADO` em `ink` sobre `line`, `CONCLUIDO` em `success`, `CANCELADO` em `ink-muted` riscado, `FALTOU` em `danger`.

## Tipografia

| Papel | Fonte | Uso |
|---|---|---|
| Títulos | **Playfair Display** (Google Fonts), 600–700 | Títulos da vitrine e nomes de seção. Conversa com o "A" serifado do logo |
| Texto e interface | **Inter** (Google Fonts), 400/500/600 | Todo o resto: formulários, tabelas, botões, administração |

- A escala mobile first (base 16px) usa a escala padrão do Tailwind, de `text-sm` até `text-4xl`.
- Na administração, os títulos também usam Inter: lá a prioridade é densidade e leitura rápida.

## Tom

- **Visual:** clássico e sóbrio, com cara de barbearia tradicional e sem exagero. A vitrine tem mais respiro e fotos; a administração é limpa e direta.
- **Texto:** próximo e simples, tratando o cliente por "você". Frases curtas. Nada de jargão técnico em mensagens de erro: a mensagem diz o que aconteceu e o que fazer.
  - ✅ "Esse horário acabou de ser reservado. Escolha outro."
  - ❌ "Erro 409: conflito de agendamento."

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
  --success: #1E7F4F;
  --warning: #9A5B00;
  --danger: #B42318;
}
```

O componente usa sempre o token (`bg-brand`, `text-ink`), nunca o hex direto.

## Telas

O protótipo aprovado no Figma (2025) ainda não está acessível (P6). Até lá, as telas seguem os fluxos descritos nas specs (`docs/specs/`) e o mapa de páginas em [arquitetura.md](../arquitetura.md#web-web). Quando o acesso ao Figma for recuperado, o link entra aqui.
