# Spec — Ambiente de desenvolvimento com Docker Compose

- **Issue:** #26 (S2.04)
- **Fase:** 0 (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
API e web já sobem sozinhos (#24, #25), mas cada um com a sua ferramenta e sem banco. O [ADR 0004](../decisoes/0004-docker.md) define o `docker compose up` como o caminho oficial: o mesmo ambiente em qualquer máquina, com PostgreSQL e hot reload. As próximas tarefas (banco, login, CI) partem daqui.

## Quem usa
Mantenedores e agentes que desenvolvem o sistema. Nenhum usuário final.

## Histórias
- Como mantenedor, quero subir banco, API e web com um comando, para não depender do que está instalado na máquina.
- Como mantenedor, quero que a edição de um arquivo recarregue o serviço sem rebuild, para iterar rápido.
- Como mantenedor, quero um `.env.example` com todas as variáveis, para saber o que configurar sem ler o código.

## Regras envolvidas
Nenhuma regra de negócio. Segue os ADRs [0002](../decisoes/0002-banco-de-dados.md) (PostgreSQL) e [0004](../decisoes/0004-docker.md) (Docker).

## Critérios de aceite
**CA-1 — Sobe do zero**
- **Dado** um clone limpo com Docker instalado
- **Quando** rodo `cp .env.example .env && docker compose up`
- **Então** `db`, `api` e `web` sobem, `http://localhost:3000` mostra a página inicial e `http://localhost:8000/health` responde `{ "status": "ok" }`.

**CA-2 — Ordem de subida**
- **Dado** o compose subindo
- **Quando** o banco ainda não aceita conexões
- **Então** a `api` espera o `db` ficar saudável, e o `web` espera a `api` ficar saudável.

**CA-3 — Hot reload**
- **Dado** o compose no ar
- **Quando** edito um arquivo em `api/app` ou em `web/src`
- **Então** o serviço recarrega sozinho, sem `docker compose build`.

**CA-4 — Dependências fora do volume**
- **Dado** o código montado por volume
- **Quando** o container sobe
- **Então** ele usa o `.venv` e o `node_modules` instalados na imagem (Linux), nunca os da máquina, e as ferramentas de qualidade (`pytest`, `ruff`, `pyright`, `pnpm lint`) rodam com `docker compose exec`.

**CA-5 — Configuração sem segredo**
- **Dado** o repositório
- **Quando** procuro a configuração
- **Então** o `.env.example` da raiz lista todas as variáveis de [arquitetura.md](../arquitetura.md#variáveis-de-ambiente), sem valor real, e o `.env` é ignorado pelo git.

**CA-6 — Produção intacta**
- **Dado** os Dockerfiles com o estágio novo de desenvolvimento
- **Quando** construo a imagem sem `--target`
- **Então** sai a mesma imagem de produção de antes (último estágio, usuário não-root).

## Fluxo e telas
- `docker-compose.yml` na raiz, com três serviços:
  - **`db`**: `postgres:17-alpine`, volume nomeado `db-data`, healthcheck com `pg_isready`. A porta 5432 fica só em `127.0.0.1`, para ferramentas de banco na máquina.
  - **`api`**: estágio `dev` de `api/Dockerfile`, Uvicorn com `--reload`, `./api` montado em `/app` e o `.venv` num volume anônimo. Healthcheck em `/health`.
  - **`web`**: estágio `dev` de `web/Dockerfile`, `pnpm dev`, `./web` montado em `/app` e `node_modules` e `.next` em volumes anônimos.
- Cada serviço recebe só as variáveis que usa, conforme a tabela de [arquitetura.md](../arquitetura.md#variáveis-de-ambiente).
- `web/next-env.d.ts` sai do git e vai para o `.gitignore`: o `next dev` e o `next build` reescrevem o arquivo com caminhos diferentes, e o `pnpm typecheck` o gera de novo.
- Mudou `pyproject.toml`, `uv.lock`, `package.json` ou `pnpm-lock.yaml`? Rode `docker compose up --build -V`, que reconstrói a imagem e recria os volumes anônimos de dependências.

## API
Nenhuma rota nova.

## Fora do escopo desta spec
- Conexão da API com o banco, SQLAlchemy e Alembic (#27). As linhas de `alembic` no `CLAUDE.md` continuam marcadas como futuras.
- CI (#28), tipos gerados (#29), login (#30 e #31) e o deploy na Railway (#32).
- Serviço `jobs` de lembretes, que nasce com a funcionalidade de e-mail.

## Dúvidas em aberto
- A versão do PostgreSQL deve ser a mesma major da Railway. Escolhemos a 17; confira quando o banco da demonstração for criado (#32).
