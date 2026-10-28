# Augusto Barbearia

Sistema web de agendamento e gestão para a Augusto Barbearia.

- **Cliente:** vê os serviços e os barbeiros, agenda com a conta Google, remarca e cancela, e recebe confirmação e lembrete por e-mail.
- **Administração:** agenda de todos os barbeiros, agendamento por telefone ou balcão, conclusão de atendimento com pagamento, cadastros e relatório financeiro.

> Em desenvolvimento: Fase 0 (fundação do MVP). Ver o [roadmap](docs/produto/roadmap.md).

## Stack

Next.js (web) · FastAPI (api) · PostgreSQL · Docker · Railway. Detalhes e motivos em [docs/decisoes](docs/decisoes/).

## Rodando localmente

A fundação é entregue em duas issues independentes: API na S2.02 (#24) e web na S2.03 (#25). Os comandos de cada serviço ficam disponíveis após a respectiva entrega estar integrada.

### API

Pré-requisito: [uv](https://docs.astral.sh/uv/getting-started/installation/). A versão Python 3.14.10 está fixada em `api/.python-version` e no `pyproject.toml`; o uv pode instalá-la automaticamente.

```bash
cd api
uv sync --locked
uv run uvicorn app.main:app --reload
```

- Saúde: http://localhost:8000/health → `{ "status": "ok" }`
- Documentação: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

O esqueleto inicia sem banco e sem credenciais. Opcionalmente, copie `api/.env.example` para `api/.env` para personalizar `APP_NAME`, o título da documentação. O padrão é "Augusto Barbearia API".

Na pasta `api/`, rode as verificações:

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run pyright
```

Para formatar: `uv run ruff format .`. O Pyright verifica `app/` em modo strict. Os testes atuais usam o cliente HTTP do FastAPI e não precisam de banco; testes de persistência entrarão com o PostgreSQL e Alembic.

Para testar a imagem, na raiz do repositório:

```bash
docker build -t augusto-api ./api
docker run --rm -p 8000:8000 augusto-api
```

A imagem final executa Uvicorn com usuário não-root e inclui somente dependências de execução. Consulte `/health` para confirmar o funcionamento.

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

### Sistema completo

O Docker Compose com PostgreSQL, API e web será entregue na S2.04 (#26). Banco, migrações, autenticação e geração dos tipos para o cliente web têm tarefas próprias da Fase 0.

## Documentação

Tudo está em [`docs/`](docs/). Para começar, leia a [visão do produto](docs/produto/visao.md), as [regras de negócio](docs/dominio/regras.md) e a [arquitetura](docs/arquitetura.md). Agentes de IA começam pelo [CLAUDE.md](CLAUDE.md).
