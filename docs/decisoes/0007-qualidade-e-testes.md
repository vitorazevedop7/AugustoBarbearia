# 0007 — Ferramentas, qualidade e testes

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
O código vai ser escrito em boa parte por agentes de IA. Ferramentas que pegam erros automaticamente (tipos, lint, testes, CI) são o que mantém a qualidade sem uma revisão humana linha a linha.

## Decisão

**API (Python)**
- Versão do Python fixada no `pyproject.toml`; gerenciador **uv**.
- **Ruff** para lint e formatação; **Pyright** (modo strict nos módulos de domínio) para tipos.
- **pytest** com o cliente HTTP do FastAPI, contra um PostgreSQL real ([0002](0002-banco-de-dados.md)).
- Cada regra de negócio implementada tem teste que **cita a RN** no nome ou na docstring (ex.: `test_rn08_nao_permite_sobreposicao`).

**Web (TypeScript)**
- Gerenciador **pnpm**; TypeScript em modo `strict`.
- **ESLint + Prettier.**
- **Vitest** para lógica de UI; **Playwright** para os fluxos ponta a ponta críticos (agendar, cancelar, concluir atendimento) a partir da Fase 1.

**Repositório**
- **GitHub Actions** em todo PR: lint, tipos e testes da API e da web. PR com CI vermelho não é mergeado.
- Commits no padrão **Conventional Commits** (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`), em português, **sem nenhuma marca ou atribuição de IA**.
- **Branch por issue** (`tipo/<n>-descricao`), **PR com `Closes #n`** e merge por rebase.

## Alternativas consideradas
- **mypy** no lugar do Pyright: equivalente. O Pyright é mais rápido e é o que roda nos editores.
- **Biome** no lugar de ESLint + Prettier: mais rápido, mas o ecossistema do Next ainda gira em torno do ESLint.

## Consequências
- O setup inicial do repositório (Fase 0) precisa entregar CI funcionando antes da primeira funcionalidade.
- Testes da API dependem do Postgres do compose, o que deixa a suíte mais lenta que com SQLite. É aceito por causa da RN-08.
