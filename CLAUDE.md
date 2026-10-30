# Augusto Barbearia

Sistema web de agendamento e gestão para a **Augusto Barbearia**, uma barbearia real com três barbeiros. O cliente agenda online (com login Google), e a administração (a equipe da barbearia) cuida da agenda, dos cadastros, da conclusão dos atendimentos com pagamento e do relatório financeiro. O barbeiro **não** é usuário do sistema. Estamos construindo o **MVP**, que será apresentado pronto aos proprietários.

> O nome é **Augusto Barbearia** (D1). "Augustus" está errado. O repositório se chama `AugustoBarbearia`.

## Stack

- **web/**: Next.js (App Router, TypeScript strict), Tailwind, Better Auth (Google + plugin JWT). É também o BFF.
- **api/**: Python + FastAPI, SQLAlchemy 2 + Alembic, Pydantic v2, pytest. Todas as regras de negócio ficam aqui.
- **PostgreSQL**, Docker / `docker compose`, deploy na Railway, e-mail via Resend.
- Os motivos de cada escolha estão em `docs/decisoes/` (ADRs 0001–0009).

## Comandos

API (#24) e web (#25) são entregas independentes. Os comandos abaixo ficam disponíveis após a respectiva entrega estar integrada.

### API — disponível a partir da S2.02

```bash
cd api
cp .env.example .env
uv sync --locked
uv run uvicorn app.main:app --reload
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run pyright
```

Na raiz, `docker build -t augusto-api ./api` e `docker run --rm --env-file api/.env -p 8000:8000 augusto-api` constroem e iniciam a imagem de produção (configure no `.env` um host de banco acessível pelo container). `GET /health` responde `{ "status": "ok" }` e `/docs` expõe o contrato. O healthcheck verifica o PostgreSQL e retorna 503 se ele estiver indisponível. `api/.env.example` documenta a configuração da API; `DATABASE_URL` é obrigatória.

### Web — disponível a partir da S2.03

```bash
cd web
pnpm install --frozen-lockfile  # Node.js 24 LTS + pnpm 10.34.9
pnpm dev
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

Na raiz, `docker build -t augusto-web ./web` e `docker run --rm -p 3000:3000 augusto-web` constroem e iniciam a imagem standalone com usuário não-root. O build baixa Inter e Playfair Display e inclui os assets na saída standalone.

### Sistema completo — disponível a partir da S2.04

O caminho oficial de desenvolvimento (ADR 0004). Sobe `db` (PostgreSQL 17), `api` (`:8000`) e `web` (`:3000`) com hot reload.

```bash
cp .env.example .env              # uma vez; preencha o que a tarefa pedir
docker compose up                 # sobe db + api + web
docker compose up --build -V      # depois de mudar dependências (lockfiles)
docker compose exec api uv run pytest
docker compose exec api sh -c "uv run ruff check . && uv run pyright"
docker compose exec web sh -c "pnpm lint && pnpm typecheck && pnpm test"
docker compose exec web pnpm auth:migrate   # cria/atualiza as tabelas do Better Auth (não é o Alembic)
docker compose down               # para tudo; `down -v` apaga também o banco
```

### Banco e migrações — S2.05

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic revision --autogenerate -m "msg"
docker compose exec api alembic check
```

Os testes criam o banco `<banco da DATABASE_URL>_test` no mesmo servidor e aplicam migrações uma vez por sessão. Cada teste usa uma transação externa com rollback, inclusive quando o service faz commit. O usuário de desenvolvimento precisa de permissão `CREATEDB`. Importe novos modelos em `api/alembic/env.py` antes de gerar migrações.

### Contrato OpenAPI — S2.07

Mudou um schema da API? Regenere os tipos do web no mesmo PR (ADR 0008). O job `contract` do CI falha se `web/src/lib/api/schema.d.ts` estiver desatualizado.

```bash
docker compose exec web pnpm gen:api                         # lê http://api:8000/openapi.json
(cd api && uv run python -m app.export_openapi /tmp/openapi.json)  # exporta sem subir o servidor
(cd web && pnpm gen:api /tmp/openapi.json)                     # gera a partir do arquivo exportado
```

### Autenticação da API — S2.09

Configure `ADMIN_EMAILS` no `.env` (e-mails Google separados por vírgula), `AUTH_JWKS_URL` (no Compose, `http://web:3000/api/auth/jwks`) e os mesmos `AUTH_ISSUER` / `AUTH_AUDIENCE` no web e na API.

```bash
docker compose up -d api web                         # aplica mudanças nas variáveis
docker compose exec api uv run pytest tests/test_auth.py
```

Os testes de auth usam chaves Ed25519 locais e JWKS simulado, sem web/Google. Após entrar com Google, `/admin` mostra “Acesso permitido” apenas para contas em `ADMIN_EMAILS`; outras voltam para `/`. A API expõe `GET /me` (identidade, papel e se o cliente tem telefone) e `GET /admin/ping` (administradores). O cliente web envia o Bearer de `getApiToken()` automaticamente por requisição. A [spec](docs/specs/autenticacao-api.md) documenta validação, erros e rotação de chaves.

### Perfil do cliente — S3.06

```bash
docker compose exec api alembic upgrade head          # cria a tabela customers
docker compose exec api uv run pytest tests/test_customers.py
```

O primeiro acesso autenticado de um cliente cria o `Customer` ou o vincula pelo e-mail (RN-23). Com uma conta fora de `ADMIN_EMAILS`, `/perfil` mostra nome, e-mail e telefone e salva por Server Action; a administração é levada para `/admin`. Novas rotas do cliente usam a dependência `current_customer` de `app/modules/customers/dependencies.py`. A [spec](docs/specs/perfil-cliente.md) documenta o vínculo e o formato do telefone.

### Cadastro de barbeiros — S3.03

```bash
docker compose exec api alembic upgrade head          # cria barbers e preenche fotos placeholder dos proprietários sem foto
docker compose exec api uv run pytest tests/test_barbers.py
```

A administração cria, edita, inativa e reativa barbeiros em `/admin/cadastros/barbeiros` (`GET`/`POST /admin/barbers`, `GET`/`PATCH /admin/barbers/{id}`). A foto é o caminho de um arquivo em `web/public/images/barbeiros/`, sem upload; as fotos fictícias dos proprietários (D10) estão incluídas desde a S3.10 (#63), com migração que preserva fotos já definidas pela administração. Nos testes da API, as fixtures `admin` e `customer` do `conftest.py` dão um cliente HTTP já autenticado. A [spec](docs/specs/cadastro-barbeiros.md) documenta as validações; a trava da RN-60 (agendamentos futuros) entrou na S3.07.

### Cadastro de serviços — S3.04

```bash
docker compose exec api alembic upgrade head          # cria services e barber_services com Corte Simples e Corte + Barba
docker compose exec api uv run pytest tests/test_catalog.py
```

A administração cria, edita, inativa e reativa serviços em `/admin/cadastros/servicos` (`GET`/`POST /admin/services`, `GET`/`PATCH /admin/services/{id}`), escolhendo os barbeiros que os realizam. O módulo é `app/modules/catalog/` (`Service` e `BarberService`); as regras da RN-61 ficam em `service.py` (`check_price`, `check_duration`, `resolve_barbers`). O preço trafega como string decimal (`"25.00"`) e o web formata com `formatPrice` de `src/lib/format.ts`, sem `float`. A [spec](docs/specs/cadastro-servicos.md) documenta as validações e o formato do preço.

### Vitrine pública — S3.05

```bash
docker compose exec api uv run pytest tests/test_vitrine.py
```

Sem login, `/` mostra o hero, até 4 serviços, a equipe e o bloco de horário e contato (`#contato`); `/servicos` e `/barbeiros` mostram todos. A API expõe `GET /public/services` (serviços ativos com os barbeiros ativos que os realizam; o serviço sem nenhum barbeiro ativo não aparece) e `GET /public/barbers` (barbeiros ativos), em routers públicos dos módulos `catalog` e `barbers`; os dados da barbearia vêm de `GET /public/shop`. O web lê essas rotas por `src/lib/api/public.ts` (`createPublicApiClient`, sem token), e o rodapé também lê o horário e o contato da API. Todo "Agendar" leva a `/agendar` (S3.08). Os cards (`ServiceCard`, `BarberCard`, `BarberPhoto`) e o `MobileMenu` estão em `src/components/ui/`. A [spec](docs/specs/vitrine.md) documenta o que aparece e por quê.

### Agendamento e disponibilidade — S3.07

```bash
docker compose exec api alembic upgrade head          # cria appointments com a exclusion constraint da RN-08
docker compose exec api uv run pytest tests/test_availability_slots.py tests/test_availability.py tests/test_appointments.py
curl "http://localhost:8000/public/availability?barber_id=1&service_id=2&date=AAAA-MM-DD"
```

O cálculo dos horários (RN-05) é a função pura `available_slots` de `app/modules/availability/slots.py`: recebe o dia, o expediente, a oferta (duração, ativos, quem realiza), os intervalos ocupados, o agora e a política (`CUSTOMER_POLICY`: 1h e 30 dias). Os bloqueios (RN-03) entram na lista de ocupados na Sprint 4. A criação de agendamento (S3.08) chama `ensure_slot_available` (`availability/service.py`), que trava o barbeiro com `FOR SHARE` e levanta `409 SLOT_UNAVAILABLE`, e traduz o erro do insert com `is_slot_conflict` (`appointments/service.py`), que reconhece a violação da constraint e o deadlock entre duas reservas simultâneas. Rotas que dependem do relógio recebem `utc_now` (`app/clock.py`) por `Depends`, e os testes o substituem. Os testes de concorrência usam conexões próprias e apagam o que gravaram. A [spec](docs/specs/disponibilidade.md) documenta as regras e as decisões.

### Agendamento pelo cliente — S3.08

```bash
docker compose exec api uv run pytest tests/test_booking.py tests/test_availability.py
curl "http://localhost:8000/public/availability/days?barber_id=1&service_id=2"
```

`/agendar` tem uma escolha por tela: barbeiro → serviço → dia → horário → confirmar (D11), com o estado na URL (`?barbeiro=&servico=&data=&hora=`, montada por `bookingHref` de `src/lib/booking.ts`). As etapas de escolha só leem rotas `/public` e não exigem login; a confirmação leva ao login com `voltar=` a própria URL, pede o telefone se faltar e chama `POST /me/appointments` por Server Action. A API fica no módulo `app/modules/booking/` (acima de `appointments` e `availability`, para não criar ciclo de import), com `create_customer_appointment` em `service.py`: telefone (RN-10), limite de 2 ativos com a linha do cliente travada (RN-11), `ensure_slot_available` (RN-05 a RN-07) e `is_slot_conflict` → `409 SLOT_UNAVAILABLE` (RN-08). `GET /public/availability/days` lista os dias com horário. `DayPicker` e `TimePicker` (`src/components/booking/`) recebem `hrefFor` e servem para a remarcação. A [spec](docs/specs/agendamento-cliente.md) documenta as regras e as decisões.

### Meus agendamentos — S3.09

```bash
docker compose exec api uv run pytest tests/test_my_appointments.py
```

`/meus-agendamentos` (grupo `(cliente)`, exige login) mostra os próximos e o histórico em cartões, com "Remarcar" e "Cancelar" quando a API diz que pode (`can_cancel`, `can_reschedule`, RN-14) e o contato da barbearia (`ContactNotice`, `src/components/booking/`) quando o prazo de 2 horas passou. Cancelar tem a própria página de confirmação (`/meus-agendamentos/[id]/cancelar`), que funciona sem JS; remarcar (`/meus-agendamentos/[id]/remarcar?barbeiro=&data=&hora=`) reaproveita `BarberStep`, `DayPicker`, `TimePicker` e a moldura `booking-frame.tsx` de `src/components/booking/`. As duas Server Actions voltam para a lista com `?aviso=`. Na API, tudo fica em `app/modules/booking/`: `GET /me/appointments` (`upcoming`/`history`), `GET /me/appointments/{id}`, `POST .../cancel`, `POST .../reschedule` e os horários da remarcação em `GET .../availability/days` e `GET .../availability`. O agendamento de outro cliente responde `404 APPOINTMENT_NOT_FOUND` (RN-16). A remarcação passa um `Rescheduling` (`availability/service.py`) para o motor: o próprio agendamento sai dos ocupados, vale a duração congelada (RN-13) e o horário atual não é oferecido de novo. A [spec](docs/specs/meus-agendamentos.md) documenta as regras e as decisões.

## Mapa da documentação

| Documento | Leia quando |
|---|---|
| `docs/produto/visao.md` | For entender o problema, os usuários e o que está **fora do escopo** |
| `docs/produto/roadmap.md` | For decidir se algo entra agora (fases 0–3) |
| `docs/dominio/regras.md` | **Sempre** antes de implementar ou alterar comportamento. As regras são `RN-xx` |
| `docs/dominio/modelo.md` | For criar ou mudar entidades. Tem o glossário PT↔código |
| `docs/arquitetura.md` | For decidir onde um código mora, as camadas, as rotas e as variáveis de ambiente |
| `docs/decisoes/*.md` | For questionar uma escolha técnica. Os ADRs explicam o porquê |
| `docs/design/identidade-visual.md` | For mexer na marca (logo, tokens de cor, fontes, tom, movimento) |
| `docs/design/design-system.md` | For criar ou alterar qualquer tela (componentes, padrões, checklist de acessibilidade) |
| `docs/specs/<feature>.md` | For implementar uma funcionalidade. É o contrato dela |
| `docs/cliente/registro.md` | For precisar saber de onde veio um fato ou uma decisão de produto (D0–D9) |

## Como trabalhar

1. **Todo trabalho começa de uma issue.** Leia a issue (`gh issue view <n>`), as dependências dela e a spec indicada. Sem spec, a primeira tarefa é escrever a spec com `docs/specs/_TEMPLATE.md`.
2. **Uma issue por vez**, dentro do escopo dela. Se aparecer trabalho extra, abra outra issue em vez de expandir esta.
3. **Branch** `tipo/<n>-descricao` (ex.: `feat/23-agendamento-cliente`). **PR** com `Closes #n`, seguindo o template. Merge por rebase.
   - O **CI** (`.github/workflows/ci.yml`) roda os mesmos comandos de qualidade da API e do web em todo PR. **PR com CI vermelho não é mergeado** (ADR 0007). Rode as verificações antes de abrir o PR.
   - O GitHub **não bloqueia** o merge: no plano gratuito, repositório privado não tem proteção de branch (#46). Antes de mergear, confira com `gh pr checks <n>` que `changes` está `pass` e que `api`, `web` e `contract` estão `pass` ou `skipping`. Se o `changes` falhar, os outros também aparecem como `skipping` sem ter rodado nada.
4. **Documentação no mesmo PR:** mudou o comportamento → atualize `regras.md`, a spec, `modelo.md` (se mudou entidade ou relacionamento) ou `arquitetura.md`. Documentação desatualizada é bug.
5. **ADRs aceitos não são editados.** Se uma decisão precisa mudar, pare e pergunte ao humano. A mudança vira um ADR novo que substitui o anterior.
6. **Dúvida de produto** (algo que nenhuma RN ou spec responde): pergunte em vez de inventar. Se a resposta virar regra, ela entra em `regras.md`.

### Kanban

- O quadro é o GitHub Project **"Augusto Barbearia"**. A sprint é o **milestone** (ex.: "Sprint 2 — Fundação (Fase 0)").
- **Título de issue:** `[Sn.mm] tipo: descrição`.
  - `Sn` é a sprint (milestone) e `mm` é a sequência dentro da sprint, com dois dígitos (`01`, `02`…). Exemplo: `[S2.08] feat: login com Google pelo Better Auth no web`.
  - **A sequência segue as dependências:** uma tarefa sempre tem número maior que todas as que a bloqueiam. Então, ler de `01` em diante é uma ordem válida de execução. Tarefas sem dependência entre si podem ser feitas em qualquer ordem.
  - Uma tarefa que entra na sprint depois do planejamento recebe o próximo número livre. Os números não são renumerados depois que a sprint começa.
  - `tipo` segue o Conventional Commits. Uma issue sem sprint usa `[Backlog]`. Se a issue mudar de sprint, ela ganha um código novo, e o milestone muda junto.
  - Na descrição, as dependências citam o número e o código: `Bloqueada por #27 (S2.05)`.
- `gh issue list --milestone "<nome da sprint>"` lista a sprint; `gh issue list --label documentation` filtra por tipo.
- As dependências entre issues são marcadas como "blocked by" no GitHub. Não comece uma issue bloqueada.

## Regras de código

**Gerais**
- Identificadores no código em **inglês** (ver o glossário em `modelo.md`). Interface, mensagens ao usuário e documentação em **português do Brasil**.
- **Regra de negócio só na API**, em `app/modules/<modulo>/service.py`, citando a `RN-xx` em comentário ou docstring. O web nunca decide regra; ele só exibe o `message` do erro da API.
- **Erros da API** no formato `{ "code": "...", "message": "..." }`, com o `message` em português e pronto para o usuário (ADR 0008).
- Datas em `timestamptz` no banco; conversão para `America/Sao_Paulo` só nas bordas (RN-01). Dinheiro em `Decimal`/`numeric(10,2)`, nunca em `float`.
- Nada de segredo no código ou no git. Toda variável nova entra no `.env.example` e na tabela de `arquitetura.md`.

**API (Python)**
- Estrutura por módulo: `router.py` (HTTP) → `service.py` (regras) → `models.py` (SQLAlchemy); `schemas.py` (Pydantic).
- Tipagem completa; Ruff e Pyright limpos.
- Testes com pytest contra o Postgres do compose. Cada RN implementada tem teste com a RN no nome (ex.: `test_rn14_cliente_nao_cancela_com_menos_de_2h`).
- O schema só muda por migração do Alembic, revisada no PR.

**Web (TypeScript)**
- Server Components para ler dados e Server Actions para mutações, sempre pela API. O navegador não chama a API diretamente.
- Cliente HTTP só pelo `src/lib/api/client.ts`, com os tipos **gerados** (`pnpm gen:api`). Não edite `schema.d.ts` à mão.
- Mobile first (funcionar em 360px). Cores e fontes só pelos tokens da identidade visual, nunca hex solto.

## Commits

- **Conventional Commits**, em português: `feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`.
- Corpo explicando o porquê, quando não for óbvio, e `Closes #n` quando fechar a issue.
- **Nenhuma marca ou atribuição de IA** nos commits ou PRs: sem "Co-Authored-By", sem "Generated with", sem emoji de robô.
