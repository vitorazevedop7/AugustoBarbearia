# Spec — CI no GitHub Actions

- **Issue:** #28 (S2.06)
- **Fase:** 0 (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
O [ADR 0007](../decisoes/0007-qualidade-e-testes.md) exige lint, tipos e testes da API e do web em todo PR, e diz que PR com CI vermelho não é mergeado. Até aqui, as verificações rodavam só na máquina de quem abria o PR.

## Quem usa
Mantenedores e agentes, em todo PR e em todo push na `main`.

## Histórias
- Como mantenedor, quero que todo PR seja verificado sozinho, para não depender de alguém lembrar de rodar os comandos.
- Como mantenedor, quero que um PR que só mexe na API não espere o build do web (e vice-versa), para o CI ser rápido.

## Regras envolvidas
Nenhuma regra de negócio. Segue o ADR 0007 e os comandos do `CLAUDE.md`.

## Critérios de aceite
**CA-1 — Disparo**
- **Dado** um PR para qualquer branch, ou um push na `main`
- **Quando** o GitHub recebe o evento
- **Então** o workflow `CI` roda.

**CA-2 — Job `api`**
- **Dado** o workflow rodando
- **Quando** o job `api` executa
- **Então** ele instala as dependências com uv (com cache e lockfile travado) e roda `ruff check`, `ruff format --check`, `pyright`, `alembic upgrade head` e `pytest`, contra um PostgreSQL 17 num service container.

**CA-3 — Job `web`**
- **Dado** o workflow rodando
- **Quando** o job `web` executa
- **Então** ele instala as dependências com pnpm (com cache e `--frozen-lockfile`) e roda `lint`, `typecheck`, `test` e `build`.

**CA-4 — Só o que mudou**
- **Dado** um PR que só altera `api/` (ou só `web/`)
- **Quando** o CI roda
- **Então** só o job da pasta alterada executa, e o outro aparece como pulado (*skipped*). Mudanças no próprio workflow rodam os dois. Na `main`, os dois sempre rodam.

**CA-5 — Vermelho bloqueia**
- **Dado** um PR com erro de lint, tipo ou teste
- **Quando** o CI roda
- **Então** o job correspondente fica vermelho.

## Fluxo e telas
- Arquivo: `.github/workflows/ci.yml`, com três jobs:
  - **`changes`** decide o que rodar com `git diff` entre a base do PR e o commit de merge. Não usa nenhuma action de terceiros para isso.
  - **`api`**, que roda dentro de `api/`.
  - **`web`**, que roda dentro de `web/`.
- **Pulado conta como aprovado.** Um job pulado pelo `if` conta como aprovado para as regras de proteção da branch. Por isso dá para exigir `api` e `web` sem travar PRs que só mexem em uma pasta, ou só em `docs/`.
- **Versões:**
  - as actions ficam fixadas por SHA, com a versão em comentário;
  - Node, pnpm, Python e uv vêm dos mesmos arquivos do projeto: `web/.node-version`, `packageManager`, `api/.python-version` e a versão do uv do `api/Dockerfile`.
- **Segurança:** o token do workflow só lê o repositório (`permissions: contents: read`), e o checkout não guarda credenciais.
- **Execuções antigas:** um push novo no mesmo PR cancela a execução anterior.
- **Proteção da `main`** (manual, feita pelo Vitor nas configurações do GitHub): exigir os checks `api` e `web` antes do merge.

## API
Nenhuma rota nova.

## Fora do escopo desta spec
- Testes ponta a ponta com Playwright (Fase 1, ADR 0007).
- Build e publicação das imagens Docker, e o deploy (#32).
- Geração e conferência dos tipos do OpenAPI (#29).

## Dúvidas em aberto
Nenhuma.
