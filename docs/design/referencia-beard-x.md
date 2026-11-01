# Referência visual: Beard X

> **O que é:** o reverse engineering do front-end que escolhemos como referência para a vitrine. Serve de base para o design system da Augusto Barbearia.
> **Status:** análise de 2026-10-28, corrigida e completada com medições ao vivo (CSS real, dados das interações do Webflow e medições em 375 e 1440px) em 2026-10-31. A adaptação para a nossa identidade está em [identidade-visual.md](identidade-visual.md).

## Origem e licença

- **Vitrine:** template **Beard X**, da BRIX Templates, para Webflow ([home](https://beardtemplate.webflow.io/home), [style guide](https://beardtemplate-showcase.webflow.io/template-pages/style-guide)). Foi escolhido entre os 31 sites de barbearia da galeria Made in Webflow porque tem quase a estrutura do nosso MVP: serviços com preço, exatamente 3 barbeiros com página própria, contato e uma chamada para agendar em toda seção.
- **Fluxo de agendamento:** padrão do **Squire**, a ferramenta que barbearias reais da galeria usam. Nenhum site da galeria tem agendamento próprio.
- **Licença:** o Beard X é um template **pago**, e o Squire é um produto de terceiro. Reproduzimos **estrutura, hierarquia, espaçamentos e padrões de interação**, com os nossos tokens e o nosso código. **Não** copiamos imagens, ícones, ilustrações, textos nem código deles.

## O "sistema" do Beard X em 10 padrões

1. **Três cores fazem tudo:** quase-preto `#121212`, creme `#F8F5EF` no fundo e um único acento champanhe `#DEC7A6`, com `#C09B6B` para o hover. O branco alterna seções e serve de fundo para cards.
2. **Títulos enormes:** Barlow 900 em caixa alta, com 92px no hero e 56px nas seções. O corpo é General Sans 18px, com entrelinha de 1,667.
3. **Tudo é quadrado:** raio 0 em botões, cards, campos e imagens.
4. **Botões grandes:** 84px de altura, em caixa alta, e largura total no celular. O hover troca a cor e sobe 3px.
5. **Ornamento de bigode no lugar do texto pequeno acima do título:** um SVG pequeno no acento, sozinho ou entre duas linhas de 56×2px, sempre 24px acima do título. Além dele, ornamentos SVG maiores flutuam nas bordas das seções, atrás do conteúdo.
6. **Muito respiro:** as seções têm 240px de padding vertical no desktop (88px no celular). O container vai até 1340px, e os blocos de título ficam em até ~800px.
7. **Faixas escuras e claras alternadas:** hero e rodapé escuros; seções em creme e branco; nas páginas internas, uma faixa escura parcial que cards e fotos atravessam. O hero da home ocupa a tela inteira, e o cabeçalho fica dentro dele.
8. **Formulários com só a linha de baixo,** sobre fundo escuro. O foco pinta a linha com o acento.
9. **Quase nenhuma elevação:** uma única sombra suave (`0 2px 12px` a 8%) em cards brancos.
10. **Movimento discreto:** os hovers duram 300ms `ease`. Os blocos sobem, aparecem ou dão um leve zoom uma vez ao entrar na tela, em 500ms `ease`.

## Tokens e layout (valores de referência)

| Tema | Beard X |
|---|---|
| Breakpoints | 479, 767 e 991px (Webflow) |
| Container | máx. 1340px; padding lateral de 16, 20 e 24px |
| Padding vertical de seção | 88, 100, 160 e 240px (do celular ao desktop) |
| Gap de grid | 28px (padrão) |
| Escala de títulos (medida no CSS) | display-1 **92 / 64 / 40 / 32px** · display-2 **56 / 34 / 28px** · display-3 **38 / 32 / 26 / 24px** · display-4 **24 / 22 / 20px**, do desktop ao celular. Entrelinhas de 1,065, 1,196, 1,368 e 1,583 |
| Corpo | 18px com entrelinha 1,667 no desktop; 16px no celular |
| Botão | Barlow 900 em caixa alta, 18px; 84px de altura a partir de 768px, 64px abaixo dele e 60px com largura total abaixo de 480px |
| Hero | altura de tela inteira; overlay preto a 70%; foto com `background-attachment: fixed` no desktop e desligado no celular |
| Cabeçalho | dentro do hero, transparente e **não fixo**: 130px de altura no desktop. Nas páginas internas, uma faixa escura de 130px |
| Raio | 0 (as exceções são o botão circular e o acordeão) |
| Sombra | `0 2px 12px rgba(16,16,16,.08)` |
| Transição | 300ms `ease` em todas as 63 transições do CSS |

**Componentes do style guide:** botão primário, outline e "link com seta" em 3 tamanhos; badge; botão circular; ícone social quadrado; campos com linha inferior em 3 tamanhos; card de serviço (ícone, nome, descrição e preço); card de barbeiro (foto inteira com gradiente e o texto por cima); depoimento; bloco de estatística; acordeão; faixa de Instagram; rodapé com newsletter.

## Estrutura das páginas

| Página | Sequência de seções |
|---|---|
| Home (11 blocos) | hero de tela inteira com foto e overlay → sobre com 2 números → **serviços** (um card branco com grade de 2 colunas) → galeria → vídeo → diferenciais → produtos → depoimentos (slider) → Instagram → rodapé com newsletter |
| Sobre | hero com faixa escura parcial → história → números → **equipe** (3 cards em degraus de 0, 75 e 145px, com o texto sobre a foto) → Instagram |
| Serviços | hero escuro → o mesmo card de serviços |
| Barbeiro | hero em 2 colunas (foto · nome, cargo, bio, redes) |
| Contato | telefone e e-mail com ícone → formulário → unidades (endereço, horário, telefones) → FAQ em acordeão |

**No celular:** tudo vira uma coluna, os botões ocupam a largura toda, a foto do hero rola junto com a página (sem fundo fixo), o menu vira hambúrguer (com o botão de agendar dentro do painel) e os sliders mostram bolinhas.

### Mapeamento para o nosso MVP

| Nosso | Vem do Beard X | Precisamos criar |
|---|---|---|
| Home / vitrine | hero, sobre, serviços, equipe, rodapé | **duração** no card de serviço; card de **endereço e horário de funcionamento** (vindo da API), com "Como chegar" e WhatsApp |
| Serviços | card de serviços | duração; botão "Agendar" por serviço |
| Barbeiros | card e página de barbeiro | botão "Agendar com ele" |
| Contato e localização | card de unidade (sem slider), FAQ | FAQ com as regras de cancelamento (D6) |
| Agendamento, meus agendamentos, perfil | — (vem do Squire) | o fluxo inteiro, cards de agendamento, estados vazios |
| Administração | só campos, badges e botões | todo o resto, a partir do design system |

**Descartar:** loja, carrinho, blog, newsletter, formulário de contato, vídeo, slider de unidades. Depoimentos e Instagram ficam de fora até existir material real.

## Movimento e imagens

**Como o Beard X faz** (valores medidos):
- As animações estão no Webflow Interactions (273 eventos, 51 animações). Na prática, são **três presets de entrada ao rolar**, disparados uma vez só:
  - **sobe:** o elemento sobe e aparece, deslocando **10% da altura dele mesmo** (não um valor fixo em pixels), em 500ms com `ease`;
  - **aparece:** só a opacidade, em 500ms;
  - **zoom:** a escala vai de 0,92 a 1 enquanto aparece.
- Os atrasos vão de 0,2 a 0,6s. O **bloco de título** (ornamento, título e texto) anima inteiro, como uma unidade, e as grades entram em cascata.
- O hero entra em cascata: fundo, selo, título, texto e botões, de 200 em 200ms.
- Os hovers duram 300ms `ease`: os botões sobem 3px, e as fotos de equipe e galeria dão zoom de 1,1 dentro de uma moldura.
- O hero tem altura de tela inteira. No desktop, a foto fica fixa (`background-attachment: fixed`) enquanto a página rola sobre ela; no celular esse efeito é desligado.
- O cabeçalho **não é fixo**. Fica dentro do hero, transparente, com 130px no desktop. Quem rola a página deixa o cabeçalho para trás.
- Os ornamentos SVG flutuam nas bordas das seções, atrás do conteúdo, e aparecem com fade. É decoração: nada depende deles.
- No celular, o painel escuro do menu desce em 400ms com `ease`. A rolagem é a nativa do navegador, sem biblioteca de scroll suave.
- A carga entrega o HTML completo de uma vez. As imagens são JPG com `srcset`, mas quase nenhuma tem `loading="lazy"` nem dimensões. O overlay do hero é preto a 70%, e os ornamentos de navalha e pincel pesam 110–180 KB cada.

**Problemas que não vamos copiar:**
- **34 elementos da home começam com `opacity: 0` no HTML.** Se o JS falhar, ou até ele rodar, parte da página fica invisível.
- As animações ignoram `prefers-reduced-motion`.
- O JS é pesado: jQuery, um pacote de e-commerce e Lottie.

**Como traduzimos:**

| Efeito | Decisão | Como |
|---|---|---|
| Cascata do hero | Manter, no mesmo ritmo | Só CSS, sem esconder o conteúdo antes do JS (#78) |
| Entrada ao rolar | Manter os três presets | `IntersectionObserver` pequeno, com `rise` (10% da altura), `fade` e `zoom` (0,92 a 1), 500ms `ease` e atraso por atributo. Só esconde o que está abaixo da dobra, e só com JS ativo e sem pedido de menos movimento (#78) |
| Hero de tela inteira | Manter, só no desktop | Foto fixa no desktop e rolando junto no celular (#77) |
| Cabeçalho dentro do hero | Manter | Transparente sobre o hero, com o logo no círculo claro; vira faixa escura fixa quando a página rola (#77) |
| Hover de botão | Manter | Troca de cor e sobe 3px em 300ms `ease` |
| Zoom de foto em card | Manter | `scale(1.1)` dentro de uma moldura com `overflow: hidden` (#79) |
| Menu mobile | Manter | Painel escuro que desce em 400ms `ease`; `aria-expanded`, fecha com Esc e trava o scroll |
| Ornamentos flutuantes | Manter, próprios | 2 ou 3 SVGs leves e `aria-hidden`, atrás do conteúdo (#79) |
| FAQ | Manter | `<details>` nativo |
| Depoimentos | Se houver material | Carrossel com CSS scroll-snap, sem autoplay |
| Parallax por script, marquee, lightbox, loader, dropdown, Lottie | Cortar | O fundo fixo do hero é só CSS |
| Imagens | Melhorar | `next/image` (AVIF/WebP, dimensões, lazy), overlay em `div` e ornamentos em SVG próprio leve |

## Diferenças entre a nossa vitrine e a referência

Medidas em 2026-10-31, com a vitrine da `main` e o Beard X. A última coluna diz qual tarefa da Sprint 4 resolve cada diferença; as linhas já resolvidas dizem como ficou. Com a #80, todas as linhas com tarefa estão resolvidas; só os números do "Sobre" ficam em aberto.

| Tema | Beard X | Nossa vitrine hoje | Resolve |
|---|---|---|---|
| Carga | HTML completo de uma vez | A home pinta primeiro o esqueleto de `loading.tsx` e depois troca pelo conteúdo | #75 |
| Sessão e renderização | Página entregue inteira, sem depender de login | O `RootLayout` lê a sessão e deixa todas as páginas dinâmicas | #75 |
| Fonte dos títulos | Barlow 900, caixa alta | Igual desde a #76 | #76 |
| Escala dos títulos | display-1 92/64/40/32px · display-2 56/34/28px | Desde a #76, `clamp` contínuo com os mesmos extremos (display-1 de 32 a 92px, display-2 de 28 a 56px) | #76 |
| Corpo | 18px, entrelinha 1,667 (16px no celular) | Igual desde a #76 (`text-body`) | #76 |
| Respiro das seções | 240px no desktop, 88px no celular | Igual desde a #76 (`py-section`); container de 1340px (`max-w-site`) | #76 |
| Botão | 84px de altura; largura total no celular | Igual desde a #76: 84px a partir do `md`, 60px abaixo | #76 |
| Hero | Altura de tela inteira; foto fixa no desktop | Igual desde a #77 (`min-h-svh`); a foto fixa no desktop é uma camada `fixed` recortada por `clip-path` | #77 |
| Cabeçalho | Dentro do hero, transparente, não fixo, 130px | Desde a #77: escuro, 80px; transparente sobre o hero e faixa `ink` fixa ao rolar; sem JS, não fixo, como o Beard X | #77 |
| Menu do celular | Painel escuro que desce em 400ms | Igual desde a #77, travando a rolagem da página | #77 |
| Entrada ao rolar | 3 presets; "sobe" 10% da altura, `ease`, atrasos de 0,2 a 0,6s; título anima inteiro | Igual desde a #78: `rise` (10% da altura), `fade` e `zoom`, 500ms `ease`, atraso padrão de 200ms; título anima inteiro e as grades têm cascata de 200ms | #78 |
| Serviços | Um card único com grade de 2 colunas | Igual desde a #79, na home e em `/servicos`: card `surface` com 24×48px de padding no celular e 64×102px no desktop; cada item tem também duração, quem realiza e "Agendar" | #79 |
| Equipe | Texto sobre a foto; cards em degraus de 0, 75 e 145px | Igual desde a #79: foto 6:7 com o nome sobre um bloco escuro que cresce com o texto (contraste AA), degraus só a partir de 1024px e zoom de 1,1 no hover; "Agendar com <nome>" abaixo da foto | #79 |
| Ornamentos | SVGs flutuantes nas bordas (110–180 KB cada) | Desde a #79: navalha, tesoura e pente em traço próprio, com menos de 1 KB cada, atrás do conteúdo e só a partir de 1024px | #79 |
| Números | 2 números na seção Sobre | Sem números: não há dado real (pergunta aberta na [spec da vitrine](../specs/vitrine.md#dúvidas-em-aberto)) | — |
| Páginas internas | Faixa escura parcial que fotos e cards atravessam | Igual desde a #80: o `PageHero` continua numa faixa `ink` de 128, 192 e 240px atrás do começo do conteúdo; o card de serviços e as fotos da equipe (inclusive o degrau de 145px) a atravessam | #80 |
| Fluxo do cliente e administração | — (vem do Squire) | Desde a #80, as telas do cliente usam a base nova (Barlow 900, `text-body` no texto de apoio, botão `md` na ação principal, hover em `ease-standard` e mais respiro), sem a faixa parcial; a administração recebeu só os tokens, sem mudar densidade nem layout | #80 |

Os números do Beard X (a seção Sobre com 2 números) só entram na nossa vitrine se houver dado real. A #79 deixou a faixa de fora e registrou a pergunta na spec da vitrine.

## Fluxo de agendamento (Squire)

- **Ordem real:** unidade → barbeiro → serviço → resumo → horário. Cada etapa tem uma URL, com o pedido na query string.
- **Barbeiro:** cards em 2 colunas, com foto, nome e "disponível hoje/amanhã", e um card de "qualquer profissional".
- **Serviço:** cards com nome, duração e preço em pílula. O card escolhido ganha um check, e uma barra fixa no rodapé mostra o total.
- **Horário:** uma faixa de 6 dias que abre um calendário mensal. Os horários são chips em 3 colunas no celular, sem barra de progresso.

**Proposta para o nosso fluxo** (serviço → barbeiro → dia → horário → confirmar). A ordem final é barbeiro → serviço (D11), e o que foi implementado está na [spec do agendamento](../specs/agendamento-cliente.md):
- serviço em uma coluna no celular;
- barbeiros filtrados pelo serviço;
- faixa de 7 dias com acesso ao mês, numa janela de 30 dias;
- chips de 30 em 30 minutos agrupados em "Manhã" e "Tarde", com estado vazio;
- confirmação com resumo, o aviso das 2h (D6) e o pedido de telefone.

O estado do fluxo fica na URL (`?servico=&barbeiro=&data=&hora=`), o que permite entrar direto pela vitrine e reaproveitar as telas na remarcação.

**Decisões pendentes** (entram na spec do agendamento): exigir login antes de `/agendar` ou só na confirmação; criar ou não a página `/barbeiros/[slug]`; e se o "próximo horário livre" aparece no card do barbeiro, o que exige um endpoint a mais.
