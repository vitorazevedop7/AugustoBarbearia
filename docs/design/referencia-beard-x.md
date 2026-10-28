# Referência visual: Beard X

> **O que é:** o reverse engineering do front-end que escolhemos como referência para a vitrine. Serve de base para o design system da Augusto Barbearia.
> **Status:** análise de 2026-10-28. A adaptação para a nossa identidade está em [identidade-visual.md](identidade-visual.md).

## Origem e licença

- **Vitrine:** template **Beard X**, da BRIX Templates, para Webflow ([home](https://beardtemplate.webflow.io/home), [style guide](https://beardtemplate-showcase.webflow.io/template-pages/style-guide)). Foi escolhido entre os 31 sites de barbearia da galeria Made in Webflow porque tem quase a estrutura do nosso MVP: serviços com preço, exatamente 3 barbeiros com página própria, contato e uma chamada para agendar em toda seção.
- **Fluxo de agendamento:** padrão do **Squire**, a ferramenta que barbearias reais da galeria usam. Nenhum site da galeria tem agendamento próprio.
- **Licença:** o Beard X é um template **pago**, e o Squire é um produto de terceiro. Reproduzimos **estrutura, hierarquia, espaçamentos e padrões de interação**, com os nossos tokens e o nosso código. **Não** copiamos imagens, ícones, ilustrações, textos nem código deles.

## O "sistema" do Beard X em 10 padrões

1. **Três cores fazem tudo:** quase-preto `#121212`, creme `#F8F5EF` no fundo e um único acento champanhe `#DEC7A6`, com `#C09B6B` para o hover. O branco alterna seções e serve de fundo para cards.
2. **Títulos enormes:** Barlow 900 em caixa alta, com 92px no hero e 56px nas seções. O corpo é General Sans 18px, com entrelinha de 1,67.
3. **Tudo é quadrado:** raio 0 em botões, cards, campos e imagens.
4. **Botões grandes:** cerca de 80px de altura, em caixa alta. O hover troca a cor e sobe 3px.
5. **Ornamento de bigode no lugar do texto pequeno acima do título:** um SVG pequeno no acento, sozinho ou entre duas linhas de 56×2px, sempre 24px acima do título.
6. **Muito respiro:** as seções têm 240px de padding vertical no desktop (88px no celular). O container vai até 1340px, e os blocos de título ficam em até ~800px.
7. **Faixas escuras e claras alternadas:** hero e rodapé escuros; seções em creme e branco; nas páginas internas, uma faixa escura parcial que cards e fotos atravessam.
8. **Formulários com só a linha de baixo,** sobre fundo escuro. O foco pinta a linha com o acento.
9. **Quase nenhuma elevação:** uma única sombra suave (`0 2px 12px` a 8%) em cards brancos.
10. **Movimento discreto:** tudo em 300ms `ease`. As seções sobem e aparecem uma vez ao entrar na tela.

## Tokens e layout (valores de referência)

| Tema | Beard X |
|---|---|
| Breakpoints | 479, 767 e 991px (Webflow) |
| Container | máx. 1340px; padding lateral de 16, 20 e 24px |
| Padding vertical de seção | 88, 100, 160 e 240px (do celular ao desktop) |
| Gap de grid | 28px (padrão) |
| Escala de títulos | display-1 32→92px · display-2 28→56px · display-3 24→38px · display-4 20→24px |
| Corpo | 16px no celular e 18px no desktop, entrelinha 1,67 |
| Raio | 0 (as exceções são o botão circular e o acordeão) |
| Sombra | `0 2px 12px rgba(16,16,16,.08)` |
| Transição | 300ms `ease` em todas as 63 transições do CSS |

**Componentes do style guide:** botão primário, outline e "link com seta" em 3 tamanhos; badge; botão circular; ícone social quadrado; campos com linha inferior em 3 tamanhos; card de serviço (ícone, nome, descrição e preço); card de barbeiro (foto inteira com gradiente e o texto por cima); depoimento; bloco de estatística; acordeão; faixa de Instagram; rodapé com newsletter.

## Estrutura das páginas

| Página | Sequência de seções |
|---|---|
| Home (11 blocos) | hero com foto e overlay → sobre com 2 números → **serviços** (um card branco com grade de 2 colunas) → galeria → vídeo → diferenciais → produtos → depoimentos (slider) → Instagram → rodapé com newsletter |
| Sobre | hero com faixa escura parcial → história → números → **equipe** (3 cards em degraus) → Instagram |
| Serviços | hero escuro → o mesmo card de serviços |
| Barbeiro | hero em 2 colunas (foto · nome, cargo, bio, redes) |
| Contato | telefone e e-mail com ícone → formulário → unidades (endereço, horário, telefones) → FAQ em acordeão |

**No celular:** tudo vira uma coluna, os botões ocupam a largura toda, o menu vira hambúrguer (com o botão de agendar dentro do painel) e os sliders mostram bolinhas.

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

**Como o Beard X faz:**
- As animações estão no Webflow Interactions (273 eventos, 51 animações). Na prática, são dois presets de entrada ao rolar ("sobe e aparece" e "aparece"), com 500ms, delays de 0,2 a 0,6s e disparo uma vez só.
- O hero entra em cascata: fundo, selo, título, texto e botões, de 200 em 200ms.
- Os hovers duram 300ms: os botões sobem 3px, e as fotos de equipe e galeria dão zoom de 1,1 dentro de uma moldura.
- O cabeçalho não é fixo e fica transparente sobre o hero. No celular, o painel do menu desce em 400ms.
- As imagens são JPG com `srcset`, mas quase nenhuma tem `loading="lazy"` nem dimensões. O overlay do hero é preto a 70%, e há ornamentos de navalha e pincel com 110–180 KB cada.

**Problemas que não vamos copiar:**
- Cerca de 31 elementos da home começam invisíveis no HTML, inclusive o cabeçalho. Se o JS falhar, a página fica vazia.
- As animações ignoram `prefers-reduced-motion`.
- O JS é pesado: jQuery, um pacote de e-commerce e Lottie.

**Como traduzimos:**

| Efeito | Decisão | Como |
|---|---|---|
| Cascata do hero | Manter, mais curta | Só CSS, com delays de 0 a 240ms. O cabeçalho não anima |
| Entrada ao rolar | Manter um preset | `IntersectionObserver` pequeno. Só esconde o que está abaixo da dobra, e só com JS ativo e sem pedido de menos movimento |
| Hover de botão | Manter | Troca de cor e sobe 2px em 300ms |
| Zoom de foto em card | Manter, mais sutil | `scale(1.05)` dentro de uma moldura com `overflow: hidden` |
| Menu mobile | Manter | `aria-expanded`, fecha com Esc e trava o scroll |
| FAQ | Manter | `<details>` nativo |
| Depoimentos | Se houver material | Carrossel com CSS scroll-snap, sem autoplay |
| Parallax, marquee, lightbox, loader, dropdown, Lottie | Cortar | — |
| Imagens | Melhorar | `next/image` (AVIF/WebP, dimensões, lazy), overlay em `div` e ornamentos em SVG próprio leve |

## Fluxo de agendamento (Squire)

- **Ordem real:** unidade → barbeiro → serviço → resumo → horário. Cada etapa tem uma URL, com o pedido na query string.
- **Barbeiro:** cards em 2 colunas, com foto, nome e "disponível hoje/amanhã", e um card de "qualquer profissional".
- **Serviço:** cards com nome, duração e preço em pílula. O card escolhido ganha um check, e uma barra fixa no rodapé mostra o total.
- **Horário:** uma faixa de 6 dias que abre um calendário mensal. Os horários são chips em 3 colunas no celular, sem barra de progresso.

**Proposta para o nosso fluxo** (serviço → barbeiro → dia → horário → confirmar):
- serviço em uma coluna no celular;
- barbeiros filtrados pelo serviço;
- faixa de 7 dias com acesso ao mês, numa janela de 30 dias;
- chips de 30 em 30 minutos agrupados em "Manhã" e "Tarde", com estado vazio;
- confirmação com resumo, o aviso das 2h (D6) e o pedido de telefone.

O estado do fluxo fica na URL (`?servico=&barbeiro=&data=&hora=`), o que permite entrar direto pela vitrine e reaproveitar as telas na remarcação.

**Decisões pendentes** (entram na spec do agendamento): exigir login antes de `/agendar` ou só na confirmação; criar ou não a página `/barbeiros/[slug]`; e se o "próximo horário livre" aparece no card do barbeiro, o que exige um endpoint a mais.
