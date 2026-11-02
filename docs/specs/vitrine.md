# Spec — Vitrine pública

- **Issues:** #54 (S3.05), #72 (S3.11, fotos placeholder do hero e do "Sobre"), #75 (S4.02, carregamento sem salto), #77 (S4.04, hero de tela inteira e cabeçalho integrado), #79 (S4.06, serviços, equipe e ornamentos), #80 (S4.07, faixa escura parcial das páginas internas), #116 (cabeçalho não fixo), #88 (login sem JavaScript), #125 (D14 e plano de imagens), #126–#131 (base comum, galeria, faixa, "Como funciona", heros internos e mosaico)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** vitrine e expansão de fotos implementadas (#125–#131)

## Contexto
O visitante, sem login e pelo celular, precisa conhecer a barbearia: os serviços com preço e duração, os barbeiros com foto e apresentação, o endereço, o horário de funcionamento e o contato. Em todo lugar há uma chamada para agendar. A vitrine segue a estrutura da referência Beard X ([referencia-beard-x.md](../design/referencia-beard-x.md)), com os nossos tokens e o nosso código.

A vitrine só mostra dados do sistema: a barbearia e o horário de funcionamento (S3.02), os barbeiros (S3.03) e os serviços (S3.04). Ela não inventa fatos sobre a barbearia nem sobre os proprietários. A única exceção aceita é o título "Nosso trabalho" sobre as fotos fictícias da galeria e do mosaico, até a troca pelas fotos reais (D14, P10). Quando um dado opcional não foi preenchido pela administração (frase de destaque, sobre, endereço, contato, apresentação do barbeiro), o bloco dele não aparece ou dá lugar a um texto genérico neutro.

## Quem usa
Visitante, cliente e administração: todos veem a vitrine (RN-70).

## Histórias
- Como **visitante**, quero **ver os serviços com preço e duração** para **saber o que a barbearia faz e quanto custa**.
- Como **visitante**, quero **conhecer os barbeiros** para **escolher com quem vou ser atendido**.
- Como **visitante**, quero **ver o endereço, o horário de funcionamento e o contato** para **saber quando e onde ir, e como falar com a barbearia**.
- Como **visitante**, quero **uma chamada para agendar em toda a vitrine** para **marcar o horário assim que decidir**.

## Regras envolvidas
- RN-60 — Barbeiro (o inativo some da vitrine)
- RN-61 — Serviço (o inativo some da vitrine)
- RN-05, item 5 — só se oferece um serviço com um barbeiro ativo que o realiza
- RN-70 — Perfis e permissões (qualquer um vê a vitrine)
- RN-02 — Horário de funcionamento (só leitura)
- RN-14 e RN-51 — prazo de alterações e condição do lembrete, descritos em "Como funciona" (sem mudar regras)

## O que a vitrine mostra
- **Serviços:** os serviços ativos, cada um com os barbeiros **ativos** que o realizam.
  - Um serviço ativo cujos barbeiros estão **todos inativos** não aparece: ninguém poderia atendê-lo, e mostrar um serviço que não dá para agendar seria enganoso (RN-05, item 5). Ele volta sozinho quando um dos barbeiros for reativado ou quando a administração ligar outro barbeiro a ele.
  - Barbeiros inativos não aparecem na lista de quem realiza o serviço.
  - A ordem é por nome, como no cadastro.
- **Barbeiros:** os barbeiros ativos, por nome, com foto e apresentação. Um barbeiro ativo aparece mesmo que não realize nenhum serviço ativo.
- **Barbearia:** nome, frase de destaque, sobre, endereço, telefone, WhatsApp, Instagram, e-mail e horário de funcionamento, vindos de `GET /public/shop` (S3.02). Essa rota já existia e é reaproveitada sem mudança.

## Critérios de aceite

**CA-1 — Serviços públicos (RN-61, RN-70)**
- **Dado** um visitante sem token
- **Quando** chama `GET /public/services`
- **Então** recebe `200` com os serviços ativos, por nome, cada um com `id`, `name`, `description`, `price` (string com duas casas), `duration_minutes` e `barbers` (`{ id, name }` dos barbeiros ativos que o realizam, por nome). Não há campo `active`.

**CA-2 — Serviço inativo some (RN-61)**
- **Dado** um serviço inativado pela administração
- **Quando** alguém chama `GET /public/services`
- **Então** o serviço não aparece. Reativado, ele volta.

**CA-3 — Barbeiro inativo some do serviço (RN-60, RN-05)**
- **Dado** um serviço realizado por dois barbeiros, um deles inativo
- **Quando** alguém chama `GET /public/services`
- **Então** o serviço aparece só com o barbeiro ativo.

**CA-4 — Serviço sem barbeiro ativo não aparece (RN-05, item 5)**
- **Dado** um serviço ativo cujos barbeiros estão todos inativos
- **Quando** alguém chama `GET /public/services`
- **Então** o serviço não aparece, e volta quando um dos barbeiros é reativado.

**CA-5 — Barbeiros públicos (RN-60, RN-70)**
- **Dado** um visitante sem token
- **Quando** chama `GET /public/barbers`
- **Então** recebe `200` com os barbeiros ativos, por nome, cada um com `id`, `name`, `photo_path` e `bio`. O inativo não aparece; reativado, ele volta.

**CA-6 — Só leitura**
- **Dado** qualquer pessoa
- **Quando** chama `POST`, `PATCH` ou `DELETE` em `/public/services` ou `/public/barbers`
- **Então** recebe `405`.

**CA-7 — Página inicial**
- **Dado** um visitante em `/`, numa tela de 360px
- **Quando** a página carrega
- **Então** vê, nesta ordem: o hero com o nome da barbearia e a chamada "Agendar horário"; o "Sobre", se preenchido; até 4 serviços com preço e duração e o link para todos; a galeria "Nosso trabalho"; a faixa "Agende pelo celular"; a equipe com foto (ou a inicial) e o link para a página dos barbeiros; "Como funciona"; e o bloco de horário e contato.

**CA-8 — Páginas de serviços e de barbeiros**
- **Dado** um visitante em `/servicos` ou `/barbeiros`
- **Quando** a página carrega
- **Então** vê todos os serviços (com quem realiza) ou todos os barbeiros (com a apresentação), cada um com a chamada para agendar. A faixa do título tem uma foto decorativa com overlay escuro; depois da listagem, o mosaico "Nosso trabalho" fecha a página antes do rodapé.

**CA-9 — Inativar tira da vitrine (RN-60, RN-61)**
- **Dado** um barbeiro ou um serviço que a administração acabou de inativar
- **Quando** o visitante recarrega a vitrine
- **Então** ele não aparece mais em `/`, `/servicos` nem `/barbeiros`.

**CA-10 — Estados vazio e de erro**
- **Dado** que não há serviço (ou barbeiro) para mostrar, ou a API não respondeu
- **Quando** o visitante abre a vitrine
- **Então** a seção mostra um `EmptyState` ("Nenhum serviço disponível no momento") ou um `Alert` `danger` ("Não foi possível carregar os serviços. Tente novamente em instantes."), e o resto da página continua funcionando.

**CA-11 — Fotos do hero e do "Sobre" (D12)**
- **Dado** um visitante em `/`, no celular (360px) ou no desktop
- **Quando** a página carrega
- **Então** o hero mostra a foto decorativa com overlay `bg-ink/70`, mantendo o texto e os botões legíveis, sem rolagem horizontal; a imagem tem preload e prioridade alta, por ser o LCP.
- Com `about` preenchido, o "Sobre" mostra a foto 3:2 com `alt` descritivo, acima do texto no celular e ao lado dele no desktop. Sem `about`, a seção inteira, incluindo a foto, não aparece.

**CA-12 — Hero de tela inteira e cabeçalho integrado (#77)**
- **Dado** um visitante em `/`, em 360px, 768px ou 1440px
- **Quando** a página carrega e ele rola
- **Então** o hero ocupa a altura da tela, sem rolagem horizontal, com o título sem quebrar palavra e os botões na largura toda em 360px; a foto fica parada só a partir de 1024px; o cabeçalho fica transparente sobre o hero e rola com a página, sem ficar fixo (decisão de 2026-11-01, #116).
- Sem JS, o cabeçalho e o menu funcionam; com `prefers-reduced-motion`, nada se move além da rolagem.

**CA-13 — Serviços, equipe e ornamentos no padrão Beard X (#79)**
- **Dado** um visitante em `/`, `/servicos` ou `/barbeiros`, em 360px, 768px ou 1440px
- **Quando** a página carrega
- **Então** os serviços ficam num card branco único, em 1 coluna no celular e 2 a partir de 768px, cada um com nome, preço, duração, quem realiza e "Agendar <serviço>".
- Os barbeiros aparecem em fotos 6:7 com o nome por cima, num degradê escuro que mantém o contraste AA, e "Agendar com <nome>" abaixo. A partir de 1024px, os cards descem em degraus de 0, 75 e 145px; abaixo disso, ficam alinhados. O barbeiro sem foto mostra a inicial, à vista acima do degradê.
- A partir de 1024px, ornamentos de traço (navalha, tesoura e pente) ficam nas bordas das seções da página inicial, atrás do conteúdo e sem rolagem horizontal. No celular e no tablet, não aparecem.
- Um barbeiro ou serviço inativo continua fora da vitrine (CA-9).

**CA-14 — Faixa escura parcial nas páginas internas (#80)**
- **Dado** um visitante em `/servicos` ou `/barbeiros`, em 360px, 768px ou 1440px
- **Quando** a página carrega
- **Então** a faixa escura do título continua atrás do começo do conteúdo (128, 192 e 240px), e o card de serviços ou as fotos da equipe a atravessam, sem rolagem horizontal. No desktop, os três cards em degraus começam dentro da faixa.
- O estado vazio e o aviso de falha ficam legíveis sobre a faixa, porque têm fundo claro.

**CA-15 — Base compartilhada e comportamento preservado (#126)**
- **Dado** o hero e o "Sobre" existentes, em 360px e 1280px
- **Quando** as fotos passam a ser declaradas em `vitrine-photos.ts` e a usar `FixedPhotoLayer` e `FramedPhoto`
- **Então** o aspecto visual é preservado, incluindo o hero fixo apenas no desktop, a condição do "Sobre", a proporção 3:2 e o zoom que respeita `prefers-reduced-motion`.

**CA-16 — Galeria "Nosso trabalho" (#127, D14)**
- **Dado** um visitante na home, com ou sem o texto do "Sobre"
- **Quando** chega à seção depois dos serviços
- **Então** vê 4 fotos com `alt` descritivo e "Agendar horário" para `/agendar`: em 360px, grade de 2 colunas com gap de 12px e molduras 3:4; no `lg`, 3 colunas com gap de 28px, laterais 2:3 em degrau e centro com 5:4 sobre 1:1.
- Serviços e galeria alternam `surface`/`paper` quando há "Sobre" e `paper`/`surface` sem ele. Nenhuma combinação cria duas seções claras vizinhas do mesmo tom.

**CA-17 — Faixa de agendamento (#128, D14)**
- **Dado** um visitante entre a galeria e a equipe
- **Quando** rola a home
- **Então** vê o ornamento, "Agende pelo celular", o texto sobre escolher barbeiro, serviço e horário e receber confirmação por e-mail, e "Agendar horário". A foto decorativa usa posição 55% 50% e overlay `bg-ink/70`, com texto em contraste AA.
- A foto fica fixa só no `lg`; no celular, rola junto. A seção usa `py-section` e, no desktop, no mínimo 70svh. Não há vídeo nem botão de play.

**CA-18 — Como funciona (#129, RN-14, RN-51, D11)**
- **Dado** um visitante entre a equipe e "Horário e contato"
- **Quando** lê "Como funciona"
- **Então** vê os passos barbeiro → serviço → dia e horário → confirmação com a conta Google; o lembrete por e-mail cerca de um dia antes, apenas para reservas feitas com pelo menos 24 horas de antecedência; e a opção de cancelar ou remarcar pelo site até 2 horas antes. O texto não promete lembrete para reservas mais próximas do horário.
- As fotos 7:8 têm `alt` descritivo. No celular só aparece a grande, acima do texto. A menor aparece a partir de `md`, sobreposta com borda `surface` de 8px; no `lg`, a grande sangra para a direita da coluna. A seção recorta a sangria e não causa rolagem horizontal em 360px.

**CA-19 — Foto nos heros internos (#130, D14)**
- **Dado** um `PageHero` com ou sem `photo`
- **Quando** renderiza o topo de `/servicos` ou `/barbeiros`
- **Então** a foto, quando presente, fica somente atrás do título e da descrição, decorativa e sob overlay `bg-ink/80`, mantendo contraste AA. A faixa parcial continua lisa; sem foto, o comportamento atual é preservado.

**CA-20 — Mosaico das páginas internas (#131, D14)**
- **Dado** um visitante no fim de `/servicos` ou `/barbeiros`
- **Quando** chega ao mosaico "Nosso trabalho"
- **Então** vê 5 fotos com `alt` descritivo: destaque em largura total e 4 fotos em 2×2 no celular; no `lg`, grade `1fr 2fr 1fr` em 2 linhas, destaque central ocupando as duas linhas e gap de 28px, com molduras quadradas.
- "Ver mais no Instagram" aparece somente com `shop.instagram` preenchido, abrindo o perfil em outra aba com `rel="noopener noreferrer"`. Sem o perfil, não há link; a seção não simula posts nem se chama "Instagram".

**CA-21 — Qualidade e carga das novas fotos (#127–#131)**
- **Dado** as fotos aprovadas na D14
- **Quando** são revisadas e usadas em 360px e 1280px
- **Então** respeitam as dimensões e os pesos do [plano](../planos/imagens-vitrine.md#4-especificação-de-cada-imagem), em JPEG progressivo sRGB sem EXIF, sem rosto identificável, texto, logo ou rótulo legível e com anatomia e ferramentas coerentes com as fotos existentes.
- Fora da foto que abre a página (o hero inicial e o topo de `/servicos` e `/barbeiros`, com preload e prioridade alta por serem o LCP), todas têm lazy padrão, `sizes` correspondente ao layout e espaço reservado pela moldura, sem salto de layout ou rolagem horizontal. Fotos em moldura usam `data-reveal="zoom"`; textos usam `rise`; a página funciona sem JS e com menos movimento.

## Fluxo e telas
Tudo fica no grupo `(publico)`, sem login. As páginas são Server Components que leem a API pelo servidor, sem token (`createPublicApiClient`), e funcionam sem JS. Elas chegam inteiras, sem esqueleto de carregamento (ver [Carregamento e cache](#carregamento-e-cache)).

- **Cabeçalho (todas as páginas):** logo, links para Serviços, Barbeiros e Contato (`/#contato`), o login e o botão "Agendar", sempre em fundo escuro (S4.04, #77).
  - Em nenhuma página ele é fixo: rola com a página, como no Beard X (decisão de 2026-11-01, #116).
  - Em `/`, fica transparente no topo do hero, como no Beard X: nunca fica transparente sobre fundo claro.
  - Nas outras páginas, é uma faixa `ink` no topo, que rola com a página. Em `/servicos` e `/barbeiros`, ela continua na faixa escura do título.
  - O login (ou "Olá, <nome>" e "Sair") é a única parte que depende do usuário. Ela chega à parte, num `Suspense` com um link "Entrar" para `/entrar` de 44px de altura, para a página não esperar a sessão e continuar oferecendo login sem JS.
  - No desktop (a partir de 1024px), tudo fica numa linha. O link da página atual tem `aria-current="page"`.
  - No celular, um botão "Menu" abre um painel escuro com os links, o botão "Agendar horário" na largura toda e o login. O painel desce de trás do cabeçalho em 400ms (sem animação com `prefers-reduced-motion`), ocupa o resto da tela e trava a rolagem da página. É um `<details>` nativo: abre, fecha e trava a rolagem sem JS. Com JS, ele também fecha com Esc (o foco volta para o botão), ao navegar e ao escolher um link.
- **`/`:**
  1. **Hero** de tela inteira (foto de fundo com overlay `ink/70`, cabeçalho por cima; no desktop, a foto fica parada enquanto a página rola): ornamento, o nome da barbearia como `h1`, a frase de destaque (ou um texto genérico sobre agendar pelo celular), "Agendar horário" (primário) e "Ver serviços" (`outline-light`). A cascata de entrada continua apenas no conteúdo sobre a foto.
  2. **Sobre** (só se o texto "sobre" estiver preenchido): foto 3:2 acima do texto no celular e ao lado dele no desktop, sem texto sobreposto à imagem. A faixa de números do Beard X não entra: não há dado real (ver [Dúvidas em aberto](#dúvidas-em-aberto)).
  3. **Serviços (`surface` com "Sobre", `paper` sem ele):** até 4 serviços num card branco único (S4.06, #79), em 1 coluna no celular e 2 a partir do `md`. Cada item tem nome e preço na mesma linha, duração, descrição, quem realiza e "Agendar". Embaixo, "Ver todos os serviços".
  4. **Galeria "Nosso trabalho" (`paper` com "Sobre", `surface` sem ele):** 4 fotos no layout assimétrico descrito em CA-16 e a chamada "Agendar horário".
  5. **Faixa de agendamento:** foto com brilho reduzido (`brightness-75`) e overlay `ink/70`, fixa só no desktop, ornamento, "Agende pelo celular", texto sobre o fluxo e confirmação por e-mail e a chamada "Agendar horário". A redução de brilho mantém contraste AA também no texto secundário sobre pontos claros.
  6. **Equipe (`paper`):** os barbeiros ativos em cards com foto 6:7 (ou a inicial), o nome e a primeira linha da apresentação sobre a foto, e "Agendar com <nome>" abaixo dela. No desktop, os cards ficam em degraus (S4.06, #79). Embaixo, "Conhecer a equipe".
  - **Ornamentos** (S4.06, #79): uma navalha no "Sobre", uma tesoura nos serviços e um pente na equipe, nas bordas das seções e atrás do conteúdo. São só decoração e aparecem a partir de 1024px.
  7. **Como funciona (`surface`):** passos e condições das RN-14 e RN-51, com as fotos sobrepostas descritas em CA-18.
  8. **Horário e contato** (faixa `ink`, âncora `#contato`): o horário de funcionamento por dia, agrupando os dias iguais ("Segunda a sexta · 10h às 19h", "Domingo · Fechado"); o endereço com "Como chegar" (busca no Google Maps); e os contatos preenchidos (WhatsApp, telefone, Instagram, e-mail). Sem endereço nem contato, só o horário aparece. Fecha com "Agendar horário".
- **Páginas internas (S4.07, #80):** como no Beard X, a faixa `ink` do título (`PageHero`) continua numa faixa parcial atrás do começo do conteúdo, que o card ou as fotos atravessam. A faixa parcial é decoração (`aria-hidden`) atrás do conteúdo e não muda a posição dele.
- **`/servicos`:** faixa `ink` com foto decorativa de bancada, overlay `bg-ink/80`, título e texto de apoio, e depois todos os serviços no mesmo card único da página inicial, atravessando a faixa parcial. Como no Beard X, cuja página de serviços repete o card da home: o visitante reconhece o bloco, a grade de 2 colunas comporta qualquer número de serviços, e cards separados repetiriam a moldura e a sombra a cada item, sem ganho de leitura. Depois da listagem, o mosaico "Nosso trabalho" aparece antes do rodapé.
- **`/barbeiros`:** faixa `ink` com foto decorativa de três cadeiras vazias, overlay `bg-ink/80` e o título, e depois todos os barbeiros nos mesmos cards, em degraus no desktop. A faixa parcial tem 240px no desktop, mais que o maior degrau (145px), então as três fotos a atravessam. Aqui a apresentação sai da foto e aparece inteira abaixo dela, porque não há página própria de cada barbeiro. Depois da listagem, o mesmo mosaico "Nosso trabalho" fecha o conteúdo.
- **Rodapé (todas as páginas):** passa a ler o horário de funcionamento e o contato de `GET /public/shop`, no lugar do horário fixo no código. Se a API falhar, o rodapé mostra só o nome e os links.

### Carregamento e cache
Na referência Beard X, a página chega inteira de uma vez. A vitrine faz o mesmo (S4.02, #75):

- **Sem esqueleto.** `/`, `/servicos` e `/barbeiros` não têm `loading.tsx`. O servidor só responde quando o conteúdo está pronto, então a primeira pintura já é o hero e as seções finais, sem troca de layout. Isso só é rápido porque os dados vêm do cache (abaixo).
- **Sessão fora do caminho crítico.** O layout raiz não lê a sessão. Só a conta do cabeçalho (`HeaderAccount`) a lê, dentro de um `Suspense` cujo fallback é um link "Entrar" para `/entrar`, com os mesmos 44px de altura dos botões. No menu do celular, o link ocupa toda a largura; no desktop, fica alinhado à direita dentro da mesma caixa fixa da conta. Assim, sem JavaScript, o login continua disponível mesmo quando o conteúdo da sessão ainda depende do script do streaming. O servidor envia a página sem esperar a sessão, e a conta chega logo depois, na mesma resposta. No desktop, a conta fica numa caixa de largura fixa, e trocar o fallback pelo login ou pelo nome não move a navegação.
- **Cache dos dados.** `getPublicShop`, `getPublicServices` e `getPublicBarbers` (`web/src/lib/api/public.ts`) guardam a resposta da API no cache de dados do Next, no servidor do web, com uma tag por leitura (`public-shop`, `public-services`, `public-barbers`). Os horários livres (`/public/availability`) não entram no cache, porque mudam a cada agendamento.
- **Invalidação (RN-60, RN-61).** As Server Actions da administração chamam `updateTag` depois que a API confirma a mudança, e a próxima visita já busca os dados novos:
  - barbeiro criado ou editado (inclusive inativado ou reativado): `public-barbers` e `public-services`, porque cada serviço lista quem o realiza e some quando fica sem barbeiro ativo;
  - serviço criado ou editado: `public-services`;
  - dados ou horário de funcionamento da barbearia: `public-shop`, que também alimenta o rodapé.
- **Rede de segurança.** Cada leitura vale por até 5 minutos. Depois disso, a próxima visita ainda recebe a cópia guardada, e o web busca a nova em segundo plano. Isso cobre mudanças que não passam pelas Server Actions (migração, banco alterado à mão).
- **Falha não fica no cache.** Se a API não responder, a seção mostra o aviso de sempre, e a próxima visita tenta de novo.
- **Renderização na requisição.** A API roda em outro serviço e não existe durante o `next build`. Por isso, as páginas não são pré-renderizadas no build (o que gravaria uma vitrine com os avisos de falha), e sim montadas a cada visita a partir do cache. O `connection()` nas leituras deixa isso explícito. No `next build`, as rotas aparecem como dinâmicas (`ƒ`). A sessão também é lida na requisição, mas dentro do `Suspense`: o servidor envia a página sem esperar por ela.
- **Página estática, se um dia fizer falta.** Só com o `cacheComponents` do Next (pré-renderização parcial) e com a API acessível no build. Sem as duas coisas, o ganho seria pequeno: o que a página espera hoje é a leitura do cache, que leva milissegundos.

### Chamada para agendar
- Todo "Agendar" leva a `/agendar`, que é implementada na S3.08 (#57). O card do serviço leva a `/agendar?servico=<id>` e o do barbeiro a `/agendar?barbeiro=<id>`, seguindo a proposta de guardar o estado do fluxo na URL ([referencia-beard-x.md](../design/referencia-beard-x.md#fluxo-de-agendamento-squire)).
- **Até a S3.08, `/agendar` responde a página 404 do Next.** A rota ainda não existe e nenhuma regra de acesso a intercepta. A S3.08 decide se o login vem antes do fluxo ou só na confirmação.

### Fotos
- Foto do barbeiro com `next/image`. No card da vitrine, a proporção é 6:7, perto da do Beard X; a miniatura da administração e a escolha do barbeiro no agendamento continuam em 4:5. O hover dá zoom de 1,1 dentro da moldura, em 300ms `ease`, sem movimento com `prefers-reduced-motion`. Os arquivos continuam em 4:5, e o `object-cover` recorta as bordas.
- **Texto sobre a foto** (S4.06, #79): o nome e a primeira linha da apresentação ficam num bloco `ink/80` a `ink/90` colado à base da foto, com uma faixa de 64px acima que esmaece até a foto. O bloco acompanha a altura do texto, e não da foto: com o nome em duas linhas, ele cresce junto. Assim o branco passa de 10:1 e o `on-ink-muted` de 5:1 sobre qualquer ponto da foto, inclusive o mais claro. Sem foto, a inicial fica acima do bloco, à vista.
- Os três proprietários têm fotos fictícias como placeholder desde a S3.10 (#63, D10). Um barbeiro sem foto mostra no card o mesmo quadro neutro com a inicial da administração. O componente `BarberPhoto` passou para `components/ui/` e é usado pelos dois lados.
- O hero da página inicial e o "Sobre a barbearia" usam fotos fictícias geradas por IA (#72, D12), até a substituição pelas fotos reais (P10). Elas combinam com as fotos dos barbeiros e com a identidade clássica e sóbria, sem rostos identificáveis, texto ou logotipo. Não retratam a Augusto Barbearia nem os proprietários e não vêm de banco de imagem.
- Os caminhos, `alt` e dimensões passam a ficar centralizados em `web/src/lib/vitrine-photos.ts` (#126), sem cadastro, upload ou troca pela administração:
  - `web/public/images/vitrine/hero.jpg`: interior de barbearia tradicional (cadeira, espelho e bancada), JPEG 16:9 de pelo menos 2400×1350, com até 400 KB. O assunto fica centralizado para preservar o foco no recorte vertical do celular.
  - `web/public/images/vitrine/sobre.jpg`: detalhe do trabalho (mãos, navalha ou tesoura), JPEG 3:2 de pelo menos 1800×1200, com até 400 KB.
- **Hero:** `next/image` com `fill`, `object-cover`, `sizes="100vw"`, `preload` e `fetchPriority="high"`, porque é o LCP. A partir de 1024px, a imagem fica numa camada `fixed`, que o `clip-path: inset(0)` do hero recorta: ela fica parada enquanto o resto da página rola. É a técnica que funciona no Safari, que ignora `background-attachment: fixed`. No celular, e com `prefers-reduced-motion: reduce`, a camada é comum e rola junto. A foto é decorativa (`alt=""`), com brilho reduzido (`brightness-75`) e overlay `bg-ink/70` para preservar o contraste AA de `text-surface` e `text-on-ink-muted`, inclusive sobre os pontos claros da foto. A foto e o overlay não entram na cascata de animação do conteúdo.
- **Sobre:** `next/image` em moldura 3:2 com `overflow-hidden`, `alt` descritivo e zoom de 1,1 no hover, respeitando `prefers-reduced-motion`, como nas fotos de card. A imagem acompanha a condição do texto: a seção inteira só aparece quando `about` estiver preenchido. No desktop, foto e texto ficam lado a lado; no celular, a foto vem acima. O texto fica fora da foto, seguindo o Beard X.
- A D14 (#125) aprova mais 14 fotos fictícias para galeria, faixa de agendamento, "Como funciona", heros internos e mosaico. Aplicam-se as mesmas restrições da D12, acrescidas da proibição de rótulos legíveis. Não se usam fotos nem referências de imagem do Beard X. O [plano de imagens](../planos/imagens-vitrine.md) define cenas, arquivos, dimensões mínimas, limites de peso, textos alternativos e a revisão antes do uso.
- `FramedPhoto` padroniza moldura, proporção fixa, lazy e zoom de 1,1 em 300ms `ease-standard`; o "Sobre" passa a usá-lo sem mudança visual. `FixedPhotoLayer` compartilha a camada fixa e o overlay entre hero e faixa de agendamento, com `[clip-path:inset(0)]` na seção.
- Os cards de serviço continuam sem foto. Heros internos ganham foto só atrás do título; a faixa parcial continua lisa. O mosaico usa fotos fictícias, sem simular feed ou publicações de Instagram; só o link externo depende do perfil cadastrado. Depoimentos, vídeo e conteúdo real de redes sociais continuam aguardando material real.

## API
| Método | Caminho | Quem | O que faz |
|---|---|---|---|
| `GET` | `/public/services` | Qualquer um | Serviços ativos com pelo menos um barbeiro ativo, por nome, cada um com os barbeiros ativos que o realizam |
| `GET` | `/public/barbers` | Qualquer um | Barbeiros ativos, por nome |
| `GET` | `/public/shop` | Qualquer um | Já existia (S3.02): dados da barbearia e horário de funcionamento |

- `GET /public/services` devolve `{ id, name, description, price, duration_minutes, barbers }`, com `barbers` = `{ id, name }`. O preço trafega como no cadastro: string decimal com duas casas.
- `GET /public/barbers` devolve `{ id, name, photo_path, bio }`.
- As rotas ficam nos próprios módulos (`catalog` e `barbers`), num router público separado do router `/admin`. A regra de quem aparece fica no `service.py` de cada módulo.

## Fora do escopo desta spec
- O fluxo de agendamento (`/agendar`): S3.08 (#57).
- As fotos placeholder dos barbeiros: entregues na S3.10 (#63).
- Página própria de cada barbeiro (`/barbeiros/[slug]`) e "próximo horário livre" no card: decisões pendentes da referência, ficam para quando o agendamento existir.
- Página de contato com FAQ (cancelamento até 2h antes, D6), depoimentos, vídeo e Instagram embutido: não há material real ainda. A galeria e o mosaico de fotos fictícias estão cobertos pela D14; produtos e loja ficam fora do MVP, como já descartado na [referência visual](../design/referencia-beard-x.md).
- Serviço em destaque escolhido pela administração: não há campo para isso. A página inicial mostra os primeiros 4 serviços, na ordem da API.
- Mapa embutido: "Como chegar" abre a busca do endereço no Google Maps.

## Dúvidas em aberto
- **Faixa de números no "Sobre" (#79):** o Beard X mostra 2 números ao lado do texto (anos de casa, clientes atendidos). A vitrine não inventa fatos, e o sistema não tem esses dados. A faixa só entra se os proprietários informarem números reais, e então cabe decidir se eles vêm de um campo novo da barbearia (cadastro da administração) ou ficam fixos no texto.
- Escolhas desta implementação que nenhuma RN decide, a confirmar:
  - o serviço ativo sem nenhum barbeiro ativo some da vitrine (a opção conservadora);
  - a página inicial mostra no máximo 4 serviços;
  - os serviços aparecem por nome, e não por preço;
  - até a S3.08, a chamada "Agendar" cai na página 404.
- Textos reais da barbearia (frase de destaque, sobre, endereço e contato) e as apresentações dos barbeiros: a administração preenche pela tela de cadastro.

## Imagem de compartilhamento (#132)

- A home publica `og:image` absoluto, resolvido a partir de `BETTER_AUTH_URL`.
- `GET /opengraph-image` responde PNG 1200×630 com `hero.jpg` escurecido, logo e AUGUSTO BARBEARIA em Barlow 900. Nenhuma foto nova é gerada.
- A fonte local `public/fonts/Barlow-Black.ttf` acompanha sua licença OFL. O preparo standalone inclui fonte, hero e logo no Docker, sem chamadas externas para gerar a prévia.
- Aceite: `pnpm build && pnpm start` e a imagem Docker devolvem a imagem no tamanho declarado, e a home contém a meta tag `og:image`.
