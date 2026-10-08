# 0004 — Docker no desenvolvimento e na produção

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
São dois serviços em linguagens diferentes ([0001](0001-arquitetura-web-api.md)) mais um PostgreSQL com extensões ([0002](0002-banco-de-dados.md)). O ambiente precisa subir igual na máquina do Vitor, num agente e na produção.

## Decisão
- **Um `Dockerfile` por serviço** (`/api/Dockerfile`, `/web/Dockerfile`), multi-stage, com imagem final enxuta e usuário não-root.
- **`docker-compose.yml` na raiz** para o desenvolvimento, com os serviços `db` (PostgreSQL), `api` e `web`, hot reload por volume e as variáveis vindas de `.env` (há um `.env.example` versionado; o `.env` nunca é versionado).
- **As mesmas imagens vão para a produção** na Railway ([0005](0005-hospedagem.md)).
- As migrações rodam como um passo explícito: `alembic upgrade head` no start da API em produção e um comando documentado no desenvolvimento.

## Alternativas consideradas
- **Rodar tudo direto na máquina (uv + pnpm + Postgres local):** mais rápido para iterar, mas o ambiente diverge entre máquinas e da produção. Continua permitido para rodar só uma parte, mas o caminho oficial é o compose.
- **Buildpacks da Railway (Nixpacks/Railpack):** menos arquivos, mas menos controle e nada reaproveitável no desenvolvimento.

## Consequências
- `docker compose up` sobe o sistema inteiro, e é esse o comando que vai no README e no `CLAUDE.md`.
- O hot reload dentro do container exige volumes bem configurados (principalmente `node_modules` e `.venv` fora do volume).
