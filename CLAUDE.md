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
docker compose down               # para tudo; `down -v` apaga também o banco
```

### Banco e migrações — S2.05

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic revision --autogenerate -m "msg"
docker compose exec api alembic check
```

Os testes criam o banco `<POSTGRES_DB>_test` no mesmo servidor e aplicam migrações uma vez por sessão. Cada teste usa uma transação externa com rollback, inclusive quando o service faz commit. O usuário de desenvolvimento precisa de permissão `CREATEDB`. Importe novos modelos em `api/alembic/env.py` antes de gerar migrações.

### Próximas entregas da Fase 0

A geração do cliente tipado estará disponível após #29: `cd web && pnpm gen:api`.

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
