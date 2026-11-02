# Plano: mais imagens na vitrine

> Brief de implementação. Quem implementa **gera** as imagens e **implementa** cada uso. Antes de começar, leia `CLAUDE.md`, `docs/design/design-system.md` (seção "Ícones e imagens"), `docs/design/referencia-beard-x.md` e a [spec da vitrine](../specs/vitrine.md).
>
> **Decisão de produto:** D14 aprovada por Vitor em 2026-11-02 no pedido de execução das issues #125–#132; registro e critérios entram na #125. A implementação segue as dependências abaixo.
>
> Levantamento feito em 2026-11-02 no site ao vivo do Beard X (`/home`, `/about`, `/services`) a 1280px: inventário de `<img>` e de `background-image`, com tamanho renderizado, proporção, `object-fit` e `background-attachment`, mais capturas de tela.

## 1. Regras que valem para todas as imagens

1. **Decisão de produto antes do código.** A **D14**, aprovada no pedido de execução das issues #125–#132, estende a D10/D12 às novas áreas (galeria, faixa de agendamento, "Como funciona", heros internos e mosaico). Ela entra no primeiro PR (#125), em `docs/cliente/registro.md`, junto da atualização da linha **P10**, do design system e da spec. A implementação das fotos depende desse registro.
2. **Nada do Beard X.** O template é pago. Reproduzimos posição, proporção e efeito, mas **não** usamos as imagens dele, nem como referência de img2img. A referência de estilo são as nossas fotos: `web/public/images/vitrine/hero.jpg`, `sobre.jpg` e `barbeiros/*.jpg`.
3. **Mesmas restrições da D12:** foto fictícia gerada por IA, sem rosto identificável, sem texto, sem logotipo e sem rótulo legível em frascos. Não retrata a Augusto Barbearia nem os proprietários, não vem de banco de imagem e será trocada pela foto real (P10).
4. **O que não entra** (e por quê):

   | Bloco do Beard X | Decisão | Motivo |
   |---|---|---|
   | Produtos (3 fotos 1:1) | Não entra | Não temos loja; descartada na [referência visual](../design/referencia-beard-x.md) |
   | Depoimentos (avatares 1:1 + estrelas) | Não entra | Seriam avaliações inventadas. Aguardam depoimentos reais |
   | Vídeo ("Take a look at our work") | Vira a **faixa de agendamento com foto** (item C) | Não temos vídeo real. Fica a foto fixa sem o botão de play |
   | Ícones de linha por serviço | Backlog | Os serviços vêm da API; um ícone por serviço exigiria campo novo no `Service` (issue separada) |
   | Ornamentos flutuantes | Já existe | `FloatingOrnament` com SVG próprio |
   | Selo/logo sobre o hero | Não entra | O hero já tem o nome; o logo fica no cabeçalho |

## 2. O que o Beard X faz (observado)

| Seção (ordem na home) | Imagens | Layout medido a 1280px | Efeito |
|---|---|---|---|
| Hero | 1 fundo | Tela inteira, `background-size: cover` | `background-attachment: fixed`, overlay preto 70% |
| Sobre ("10+ years") | 1 foto | Coluna esquerda 553×713 (**≈ 4:5**, retrato), texto e números à direita | Entrada com zoom |
| Serviços | 6 ícones de linha 65×65 | Card branco, grade de 2 colunas | — |
| **Galeria** ("unique experience") | **4 fotos** | 3 colunas de 387px, 28px de gap: **esquerda 2:3** (387×590), **centro empilhado 5:4** (387×314) **+ ≈1:1** (387×402), **direita 2:3**. As laterais começam **77px abaixo** do centro | Zoom 1,1 no hover |
| **Faixa de vídeo** | 1 fundo | 883px de altura, foto de ferramentas vista de cima em madeira escura, `background-position: 55% 50%` | Fundo **fixo**, overlay, título + CTA |
| **Diferenciais** ("Why choose us") | **2 fotos sobrepostas** | Texto e lista à esquerda; à direita uma foto **7:8** grande (613×693) que **sangra** para fora da tela e uma **7:8** menor (428×490) sobreposta, 100px para a esquerda e 294px abaixo | — |
| Produtos | 3 fotos 1:1 | 3 colunas | — |
| Depoimentos | avatares 1:1 (148px) | Slider | — |
| **Instagram** | **5 fotos** | Grade `1fr 2fr 1fr`: 4 quadradas de 280px nas laterais e **1 quadrada de 593px no centro** ocupando 2 linhas | Aparece no fim de **todas** as páginas (home, sobre, serviços) |
| Equipe (`/about`) | 3 fotos | 387×453 (6:7), em degraus | Já temos (`BarberCard`) |
| Heros internos | nenhuma | Faixa escura lisa | — |

**Resumo:** o Beard X usa foto em quase toda seção: um fundo fixo no começo e outro no meio da página, uma galeria assimétrica, um par de fotos sobrepostas ao lado do texto e um mosaico no fim de cada página. A Augusto tem hoje **5 fotos**: hero, "Sobre" (que só aparece com o texto preenchido) e as três dos barbeiros. `/servicos`, `/barbeiros`, `/entrar` e o agendamento não têm nenhuma foto além das dos barbeiros.

## 3. Nova ordem da home

Alternância de faixas mantida (escuro → claro → … → escuro):

```
Hero (ink, foto fixa)            já existe
Sobre (paper)                    já existe, só com texto
Serviços (surface)               já existe
Galeria "Nosso trabalho" (paper) NOVO, item B
Faixa de agendamento (foto fixa) NOVO, item C
Equipe (paper)                   já existe
Como funciona (surface)          NOVO, item D
Horário e contato (ink)          já existe
```

Hoje o fundo de Serviços e de Equipe depende de `shop?.about`. Revise essa lógica para que duas seções claras do mesmo tom nunca fiquem lado a lado, com e sem o "Sobre".

## 4. Especificação de cada imagem

### Bloco de estilo (repita em todos os prompts)

> Prompts em inglês, porque os modelos de imagem respondem melhor.

```
STYLE: photorealistic editorial photo of a classic, sober traditional barbershop interior,
warm tungsten light, dark stained wood cabinetry, cream plaster walls, black leather and
chrome barber chairs, small potted plants, soft background bokeh, subtle deep crimson
accent (#c41e3a) in a single fabric detail (towel, apron strap or cape trim), natural
skin and hand anatomy, shot on 35mm, shallow depth of field, consistent with the
reference photos hero.jpg and sobre.jpg.
NEGATIVE: no identifiable faces (crop above the mouth, show from behind, or cover with
towel), no text, no letters, no logos, no readable labels on bottles, no watermarks, no
extra fingers, no distorted tools, no stock-photo smile, no neon, no modern minimalist
white salon.
```

### Tabela de arquivos

Todos ficam em `web/public/images/vitrine/`, em JPEG progressivo, sRGB, sem EXIF e com qualidade ≈ 80. Nas fotos que serão cortadas no celular, deixe o assunto na **zona central de 60%**.

| ID | Arquivo | Proporção | Mínimo (px) | Máx. | Uso | Conteúdo (prompt específico) | `alt` |
|---|---|---|---|---|---|---|---|
| B1 | `galeria-degrade.jpg` | 2:3 | 1200×1800 | 300 KB | Galeria, coluna esquerda | Barber finishing a skin fade with clippers, client seen from behind/three-quarter back, cape with crimson trim, mirror out of focus | "Barbeiro acertando um degradê com a máquina" |
| B2 | `galeria-navalha.jpg` | 5:4 | 1500×1200 | 300 KB | Galeria, centro em cima | Straight razor shave, hot towel covering the client's eyes and upper face, lather on the cheek, barber's hands in focus | "Barba feita na navalha, com toalha quente" |
| B3 | `galeria-ferramentas.jpg` | 1:1 | 1400×1400 | 300 KB | Galeria, centro embaixo | Close-up on a wooden counter: scissors, comb, shaving brush, unlabeled pomade jar, folded towel | "Tesoura, pente e pincel na bancada" |
| B4 | `galeria-barba.jpg` | 2:3 | 1200×1800 | 300 KB | Galeria, coluna direita | Beard trim in profile, frame cropped at the nose line, trimmer and comb shaping the beard | "Acabamento de barba com máquina e pente" |
| C1 | `faixa-agendar.jpg` | 16:9 | 2400×1350 | 400 KB | Faixa de agendamento (fundo fixo) | Top-down flat lay on dark wood: clippers, scissors, straight razor, combs, shaving brush, unlabeled jars, crimson towel; darker on the center-left so the overlay text reads well | `""` (decorativa) |
| D1 | `como-funciona-cadeira.jpg` | 7:8 | 1400×1600 | 300 KB | "Como funciona", foto grande | Client in the barber chair seen from behind, caped, barber's hands styling the hair, warm mirror reflection blurred | "Cliente na cadeira durante o corte" |
| D2 | `como-funciona-celular.jpg` | 7:8 | 1050×1200 | 250 KB | "Como funciona", foto menor sobreposta | Hand holding a smartphone near the barbershop counter, screen dark or heavily blurred (no UI, no text), shop bokeh behind | "Cliente com o celular na barbearia" |
| E1 | `topo-servicos.jpg` | 16:9 | 2400×1350 | 350 KB | Fundo do `PageHero` de `/servicos` | Barber station detail: row of tools and products on the counter, wide shot, low-key | `""` (decorativa) |
| E2 | `topo-equipe.jpg` | 16:9 | 2400×1350 | 350 KB | Fundo do `PageHero` de `/barbeiros` | Three empty classic barber chairs in a row, mirrors, warm light (lembra os três barbeiros) | `""` (decorativa) |
| F1–F4 | `mosaico-1.jpg` … `mosaico-4.jpg` | 1:1 | 1200×1200 | 200 KB | Mosaico, 4 laterais | Variados e coerentes entre si: lavagem do cabelo (por trás), pós-barba nas mãos, cabelo penteado com pomada (nuca), poste/detalhe da cadeira cromada | Descrição curta de cada cena |
| F5 | `mosaico-destaque.jpg` | 1:1 | 1600×1600 | 300 KB | Mosaico, centro grande | Finished classic side-part haircut seen from the back/side, client's face out of frame | "Corte social pronto, visto de lado" |

São **14 imagens novas**. Faça uma revisão em lote antes de implementar: mãos com cinco dedos, ferramentas coerentes, nenhum rótulo legível, nenhum rosto reconhecível e paleta igual à do `hero.jpg`. Imagem reprovada é gerada de novo.

Pós-processamento (exemplo no macOS):

```bash
sips -c <alt> <larg> entrada.png --out tmp.png                 # recorta na proporção
sips -z <alt> <larg> tmp.png -s format jpeg -s formatOptions 80 --out web/public/images/vitrine/<arquivo>.jpg
sips -g pixelWidth -g pixelHeight -g space web/public/images/vitrine/<arquivo>.jpg
```

Confira o peso com `ls -l` e baixe a qualidade (75, 70) até caber no limite.

## 5. Implementação

### Base comum

- **`web/src/lib/vitrine-photos.ts`**: um único lugar com `{ src, alt, width, height }` de cada foto da vitrine (inclusive hero e "Sobre", hoje constantes em `page.tsx`). A troca pelas fotos reais (P10) fica restrita a esse arquivo.
- **`FramedPhoto`** (`web/src/components/ui/framed-photo.tsx`): moldura com `aspect-*`, `overflow-hidden`, `bg-line`, `next/image` com `fill`, `sizes` e `object-cover`, e o zoom 1,1 em 300ms `ease-standard` no hover do `group`, respeitando `motion-reduce`. É o padrão que o "Sobre" e o `BarberPhoto` já usam: extraia e reaproveite no "Sobre".
- **`FixedPhotoLayer`**: extraia do `Hero` a técnica da foto fixa (camada `absolute inset-0 motion-safe:lg:fixed` + `[clip-path:inset(0)]` na seção + overlay `bg-ink/70`) para o hero e a faixa C usarem o mesmo código.
- Fora do hero inicial e do topo com foto de `/servicos` e `/barbeiros` (o LCP de cada página), **nenhuma** foto usa `preload`/`fetchPriority`: todas ficam com o lazy padrão do `next/image`. A entrada usa `data-reveal="zoom"` nas molduras e `"rise"` nos textos, como já se faz.
- Raio 0, cores e fontes só pelos tokens, mobile first (360px sem rolagem horizontal).

### B. Galeria "Nosso trabalho" (home)

- Componente `web/src/components/vitrine/gallery.tsx`, com `SectionHeading` ("Nosso trabalho"; descrição genérica, sem prometer o que não sabemos) e um `ButtonLink` "Agendar horário" para `BOOKING_PATH`.
- **Celular:** grade de 2 colunas com gap de 12px, todas as molduras em `aspect-[3/4]` (B1, B2, B3, B4 em ordem).
- **`lg`:** `grid-cols-3`, gap de 28px. Colunas 1 e 3 com moldura `aspect-[2/3]` e `mt-20` (o degrau de 77px do Beard X); coluna 2 com B2 `aspect-[5/4]` em cima e B3 `aspect-square` embaixo, gap de 28px.
- `sizes`: `(min-width: 1024px) calc((min(100vw, 1340px) - 8rem) / 3), calc((100vw - 2.75rem) / 2)` (ajuste ao `max-w-site` real).

### C. Faixa de agendamento com foto fixa (home)

- Componente `web/src/components/vitrine/booking-band.tsx`: `FixedPhotoLayer` com C1 (`object-position: 55% 50%`), overlay `bg-ink/70`, `Ornament tone="dark"`, título em `text-display-2` ("Agende pelo celular") e um texto curto **verdadeiro** (escolha o barbeiro, o serviço e o horário; confirmação por e-mail), mais o botão "Agendar horário".
- Altura: `py-section` no celular; `lg:min-h-[70svh]` centralizado. A foto fica fixa só no desktop, como no hero.

### D. "Como funciona" (home)

- Componente `web/src/components/vitrine/how-it-works.tsx`, numa grade de 2 colunas no `lg`.
  - **Texto à esquerda:** `SectionHeading` alinhado à esquerda e uma lista numerada com **apenas o que o sistema faz**: 1) escolha o barbeiro; 2) o serviço; 3) o dia e o horário; 4) confirme com a conta Google. Depois, "lembrete por e-mail um dia antes" (RN-51) e "cancele ou remarque pelo site até 2 horas antes" (RN-14). Confira os textos em `docs/dominio/regras.md`; não invente diferenciais.
  - **Fotos à direita:** D1 em `aspect-[7/8]`, sangrando para a direita a partir do `lg` (`lg:-mr-[calc((100vw-min(100vw,var(--container-site)))/2)]` ou equivalente; a seção tem `overflow-hidden`). D2 em `aspect-[7/8]` com ≈ 70% da largura de D1, `absolute`, deslocada para a esquerda e para baixo (≈ 100px e 40% da altura), com uma borda `surface` de 8px para separar.
  - **Celular:** só D1, acima do texto; D2 aparece a partir do `md`.

### E. Foto no hero das páginas internas

- `PageHero` ganha `photo?: { src: string }`. Com foto, a faixa `ink` recebe a imagem por baixo (`next/image fill object-cover`) e um overlay `bg-ink/80` (o texto precisa passar no AA); a faixa parcial continua lisa. Sem foto, nada muda.
- `/servicos` usa E1 e `/barbeiros` usa E2. Esse item **diverge do Beard X** (lá os heros internos são lisos) e precisa constar na D14 e na tabela de `referencia-beard-x.md`.

### F. Mosaico no fim de `/servicos` e `/barbeiros`

- Componente `web/src/components/vitrine/photo-mosaic.tsx`, antes do rodapé, com `SectionHeading` "Nosso trabalho".
  - Se `shop.instagram` estiver preenchido (`GET /public/shop` já devolve o campo), mostre o link "Ver mais no Instagram" (`target="_blank"`, `rel="noopener noreferrer"`, ícone próprio). Senão, sem link. **Não** chame a seção de "Instagram" nem simule posts.
  - **`lg`:** `grid-cols-[1fr_2fr_1fr]`, 2 linhas, F5 no centro com `row-span-2`, gap de 28px, tudo `aspect-square`.
  - **Celular:** F5 em largura total em cima e F1–F4 numa grade 2×2 embaixo.

### G. Imagem de compartilhamento (opcional, barata)

- `web/src/app/opengraph-image.tsx` com `ImageResponse` (1200×630): `hero.jpg` ao fundo com overlay, `logo.png` e o nome "Augusto Barbearia" em Barlow 900. Não precisa de imagem nova, e o link no WhatsApp ganha prévia. Confirme que o build standalone inclui a fonte.

## 6. Testes e documentação (no mesmo PR de cada item)

- **Vitest:** cada componente renderiza as imagens com o `alt` esperado (ou `alt=""` nas decorativas). O mosaico mostra o link do Instagram só quando `instagram` existe. `PageHero` com e sem `photo`. Atualize os testes da home, de `/servicos` e de `/barbeiros`.
- **Verificação no navegador:** a 360px e a 1280px, sem rolagem horizontal, com contraste AA do texto sobre foto, foto fixa só no `lg` e sem salto de layout (as molduras têm proporção fixa). `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- **Docs:**
  - `docs/cliente/registro.md`: D14 e a linha P10.
  - `docs/design/design-system.md`: "Ícones e imagens", com as novas proporções (2:3, 5:4, 1:1, 7:8) e sem a frase "galeria… aguardam material real"; mais os novos componentes na lista.
  - `docs/specs/vitrine.md`: novos critérios de aceite e a nova ordem da home.
  - `docs/design/referencia-beard-x.md`: a tabela "Beard X → Augusto" com galeria, faixa, diferenciais, mosaico e heros internos.

## 7. Issues (`[Backlog]` até entrar numa sprint)

Uma issue por PR, na ordem das dependências:

1. #125: D14, fotos fictícias nas novas áreas. **Aval do Vitor registrado no pedido de execução de 2026-11-02.** Este plano entra no PR dela.
2. #126: base comum (`FramedPhoto`, `FixedPhotoLayer`, `vitrine-photos.ts`). Bloqueada por #125.
3. #127: galeria "Nosso trabalho" (B1–B4). Bloqueada por #126.
4. #128: faixa de agendamento com foto fixa (C1). Bloqueada por #126.
5. #129: "Como funciona" com fotos sobrepostas (D1–D2). Bloqueada por #126.
6. #130: foto no topo de `/servicos` e `/barbeiros` (E1–E2). Bloqueada por #126.
7. #131: mosaico no fim das páginas internas (F1–F5). Bloqueada por #126.
8. #132: imagem de compartilhamento (Open Graph). Independente.

As issues 3 a 7 mexem em `page.tsx` da home ou no `PageHero`. Faça uma de cada vez (ou rebase entre elas) para não conflitar.
