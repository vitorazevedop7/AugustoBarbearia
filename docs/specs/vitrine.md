# Spec — Vitrine pública

- **Issue:** #54 (S3.05)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** implementada

## Contexto
Hoje a página inicial diz "Em construção". O visitante, sem login e pelo celular, precisa conhecer a barbearia: os serviços com preço e duração, os barbeiros com foto e apresentação, o endereço, o horário de funcionamento e o contato. Em todo lugar há uma chamada para agendar. A vitrine segue a estrutura da referência Beard X ([referencia-beard-x.md](../design/referencia-beard-x.md)), com os nossos tokens e o nosso código.

A vitrine só mostra dados do sistema: a barbearia e o horário de funcionamento (S3.02), os barbeiros (S3.03) e os serviços (S3.04). Ela não inventa fatos sobre a barbearia nem sobre os proprietários. Quando um dado opcional não foi preenchido pela administração (frase de destaque, sobre, endereço, contato, apresentação do barbeiro), o bloco dele não aparece ou dá lugar a um texto genérico neutro.

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
- **Então** vê, nesta ordem: o hero com o nome da barbearia e a chamada "Agendar horário"; o "Sobre", se preenchido; até 4 serviços com preço e duração e o link para todos; a equipe com foto (ou a inicial) e o link para a página dos barbeiros; e o bloco de horário e contato.

**CA-8 — Páginas de serviços e de barbeiros**
- **Dado** um visitante em `/servicos` ou `/barbeiros`
- **Quando** a página carrega
- **Então** vê todos os serviços (com quem realiza) ou todos os barbeiros (com a apresentação), cada um com a chamada para agendar.

**CA-9 — Inativar tira da vitrine (RN-60, RN-61)**
- **Dado** um barbeiro ou um serviço que a administração acabou de inativar
- **Quando** o visitante recarrega a vitrine
- **Então** ele não aparece mais em `/`, `/servicos` nem `/barbeiros`.

**CA-10 — Estados vazio e de erro**
- **Dado** que não há serviço (ou barbeiro) para mostrar, ou a API não respondeu
- **Quando** o visitante abre a vitrine
- **Então** a seção mostra um `EmptyState` ("Nenhum serviço disponível no momento") ou um `Alert` `danger` ("Não foi possível carregar os serviços. Tente novamente em instantes."), e o resto da página continua funcionando.

## Fluxo e telas
Tudo fica no grupo `(publico)`, sem login. As páginas são Server Components que leem a API pelo servidor, sem token (`createPublicApiClient`), e funcionam sem JS. Cada uma tem um esqueleto de carregamento (`loading.tsx`).

- **Cabeçalho (todas as páginas):** logo, links para Serviços, Barbeiros e Contato (`/#contato`), o login e o botão "Agendar".
  - No desktop (a partir de 1024px), tudo fica numa linha. O link da página atual tem `aria-current="page"`.
  - No celular, um botão "Menu" abre um painel com os links, o botão "Agendar" na largura toda e o login. O painel é um `<details>` nativo: abre e fecha sem JS. Com JS, ele fecha com Esc (o foco volta para o botão), ao navegar e ao escolher um link. O painel não cobre a tela inteira, então a rolagem não é travada.
- **`/`:**
  1. **Hero** (faixa `ink`): ornamento, o nome da barbearia como `h1`, a frase de destaque (ou um texto genérico sobre agendar pelo celular), "Agendar horário" (primário) e "Ver serviços" (`outline-light`).
  2. **Sobre** (só se o texto "sobre" estiver preenchido).
  3. **Serviços:** até 4 serviços, em cards com nome, duração, preço, descrição, quem realiza e "Agendar". Embaixo, "Ver todos os serviços".
  4. **Equipe:** os barbeiros ativos em cards com foto 4:5 (ou a inicial), nome, apresentação e "Agendar com <nome>". Embaixo, "Conhecer a equipe".
  5. **Horário e contato** (faixa `ink`, âncora `#contato`): o horário de funcionamento por dia, agrupando os dias iguais ("Segunda a sexta · 10h às 19h", "Domingo · Fechado"); o endereço com "Como chegar" (busca no Google Maps); e os contatos preenchidos (WhatsApp, telefone, Instagram, e-mail). Sem endereço nem contato, só o horário aparece. Fecha com "Agendar horário".
- **`/servicos`:** faixa `ink` com o título e o texto de apoio, e depois todos os serviços nos mesmos cards.
- **`/barbeiros`:** faixa `ink` com o título, e depois todos os barbeiros nos mesmos cards.
- **Rodapé (todas as páginas):** passa a ler o horário de funcionamento e o contato de `GET /public/shop`, no lugar do horário fixo no código. Se a API falhar, o rodapé mostra só o nome e os links.

### Chamada para agendar
- Todo "Agendar" leva a `/agendar`, que é implementada na S3.08 (#57). O card do serviço leva a `/agendar?servico=<id>` e o do barbeiro a `/agendar?barbeiro=<id>`, seguindo a proposta de guardar o estado do fluxo na URL ([referencia-beard-x.md](../design/referencia-beard-x.md#fluxo-de-agendamento-squire)).
- **Até a S3.08, `/agendar` responde a página 404 do Next.** A rota ainda não existe e nenhuma regra de acesso a intercepta. A S3.08 decide se o login vem antes do fluxo ou só na confirmação.

### Fotos
- Foto do barbeiro com `next/image`, proporção fixa 4:5 e zoom de 1,05 no hover, dentro da moldura.
- Os barbeiros ainda não têm foto (as fotos placeholder entram na S3.10, #63). Sem foto, o card mostra o mesmo quadro neutro com a inicial da administração. O componente `BarberPhoto` passou para `components/ui/` e é usado pelos dois lados.
- A vitrine não usa foto no hero nem nos serviços (P10).

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
- As fotos placeholder dos barbeiros: S3.10 (#63).
- Página própria de cada barbeiro (`/barbeiros/[slug]`) e "próximo horário livre" no card: decisões pendentes da referência, ficam para quando o agendamento existir.
- Página de contato com FAQ (cancelamento até 2h antes, D6), galeria, depoimentos e Instagram embutido: não há material real ainda.
- Serviço em destaque escolhido pela administração: não há campo para isso. A página inicial mostra os primeiros 4 serviços, na ordem da API.
- Mapa embutido: "Como chegar" abre a busca do endereço no Google Maps.

## Dúvidas em aberto
- Escolhas desta implementação que nenhuma RN decide, a confirmar:
  - o serviço ativo sem nenhum barbeiro ativo some da vitrine (a opção conservadora);
  - a página inicial mostra no máximo 4 serviços;
  - os serviços aparecem por nome, e não por preço;
  - até a S3.08, a chamada "Agendar" cai na página 404.
- Textos reais da barbearia (frase de destaque, sobre, endereço e contato) e as apresentações dos barbeiros: a administração preenche pela tela de cadastro.
