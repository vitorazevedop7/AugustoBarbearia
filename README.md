# Augusto Barbearia

Sistema web de agendamento e gestão para a Augusto Barbearia.

- **Cliente:** vê os serviços e os barbeiros, agenda com a conta Google, remarca e cancela, e recebe confirmação e lembrete por e-mail.
- **Administração:** agenda de todos os barbeiros, agendamento por telefone ou balcão, conclusão de atendimento com pagamento, cadastros e relatório financeiro.

> Em desenvolvimento: Fase 0 (fundação do MVP). Ver o [roadmap](docs/produto/roadmap.md).

## Stack

Next.js (web) · FastAPI (api) · PostgreSQL · Docker · Railway. Detalhes e motivos em [docs/decisoes](docs/decisoes/).

## Rodando localmente

O caminho recomendado é o [sistema completo](#sistema-completo-recomendado) com Docker Compose. Também dá para rodar a API ou o web direto na máquina, como abaixo.

### API

Pré-requisito: [uv](https://docs.astral.sh/uv/getting-started/installation/). A versão Python 3.14.10 está fixada em `api/.python-version` e no `pyproject.toml`; o uv pode instalá-la automaticamente.

```bash
cd api
cp .env.example .env
uv sync --locked
uv run uvicorn app.main:app --reload
```

- Saúde: http://localhost:8000/health → `{ "status": "ok" }`
- Documentação: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

Copie `api/.env.example` para `api/.env` e configure `DATABASE_URL`. A API exige PostgreSQL acessível; `APP_NAME` personaliza opcionalmente o título da documentação.

Na pasta `api/`, rode as verificações:

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run pyright
```

Para formatar: `uv run ruff format .`. O Pyright verifica `app/` em modo strict. Os testes usam o cliente HTTP do FastAPI e um banco Postgres separado, criado pelas fixtures.

Para testar a imagem, na raiz do repositório:

```bash
docker build -t augusto-api ./api
docker run --rm --env-file api/.env -p 8000:8000 augusto-api
```

No `api/.env` passado ao Docker, use um host acessível pelo container (por exemplo, `host.docker.internal` no Docker Desktop). A imagem final executa Uvicorn com usuário não-root e inclui somente dependências de execução. Consulte `/health` para confirmar o funcionamento.

### Web

Use Node.js 24 LTS e pnpm 10.34.9 (versão fixada em `web/package.json`).

```bash
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Qualidade: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. O build baixa Inter e Playfair Display do Google Fonts e gera a saída standalone.

Para testar a imagem de produção, execute na raiz:

```bash
docker build -t augusto-web ./web
docker run --rm -p 3000:3000 augusto-web
```

### Sistema completo (recomendado)

Pré-requisito: Docker com o Compose v2. Na raiz do repositório:

```bash
cp .env.example .env
docker compose up
```

- Web: http://localhost:3000
- API: http://localhost:8000/health e http://localhost:8000/docs
- PostgreSQL 17: `localhost:5432` (só na própria máquina), com usuário, senha e banco do `.env`

A API espera o banco ficar saudável, e o web espera a API. O código de `api/` e `web/` é montado nos containers, então editar um arquivo recarrega o serviço. As dependências (`.venv` e `node_modules`) ficam dentro dos containers e não se misturam com as da sua máquina.

As verificações rodam nos próprios containers:

```bash
docker compose exec api uv run pytest
docker compose exec api sh -c "uv run ruff check . && uv run pyright"
docker compose exec web sh -c "pnpm lint && pnpm typecheck && pnpm test"
```

Depois de mudar `pyproject.toml`, `uv.lock`, `package.json` ou `pnpm-lock.yaml`, rode `docker compose up --build -V` para reconstruir as imagens e recriar os volumes de dependências. `docker compose down` para tudo; `docker compose down -v` também apaga os dados do banco.

O `.env.example` lista todas as variáveis do sistema; a explicação de cada uma está em [arquitetura.md](docs/arquitetura.md#variáveis-de-ambiente). Autenticação e geração dos tipos para o cliente web têm tarefas próprias da Fase 0.

## Documentação

Tudo está em [`docs/`](docs/). Para começar, leia a [visão do produto](docs/produto/visao.md), as [regras de negócio](docs/dominio/regras.md) e a [arquitetura](docs/arquitetura.md). Agentes de IA começam pelo [CLAUDE.md](CLAUDE.md).

## Banco e migrações

A API exige `DATABASE_URL`, normaliza a URL para Psycopg 3 e usa sessões SQLAlchemy 2. O `/health` consulta o banco: retorna 200 quando acessível ou 503 (`DATABASE_UNAVAILABLE`) quando indisponível. Fora do Compose, copie `api/.env.example` para `api/.env` e mantenha um Postgres acessível em `localhost:5432`.

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic check
docker compose exec api alembic revision --autogenerate -m "descricao"
```

A primeira migração habilita `btree_gist` (preparação para RN-08). Importe os futuros modelos em `api/alembic/env.py` e revise toda migração gerada. As tabelas `user`, `session`, `account`, `verification` e `jwks` pertencem ao Better Auth e são ignoradas pelo autogenerate. A imagem de produção inclui os arquivos do Alembic; aplicar migrações continua sendo um passo explícito.

`docker compose exec api uv run pytest` cria, se necessário, um banco com o nome de `DATABASE_URL` acrescido de `_test`, no mesmo servidor. O usuário precisa de `CREATEDB` (o usuário do Compose já tem). As migrações rodam uma vez por sessão de pytest; cada teste recebe uma transação com rollback, mesmo se chamar `commit()`. Use as fixtures `db_session` e `client`; não execute testes simultâneos contra o mesmo banco de teste. O banco de desenvolvimento não recebe as migrações ou os dados dos testes.
