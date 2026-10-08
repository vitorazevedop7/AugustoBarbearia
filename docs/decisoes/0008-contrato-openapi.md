# 0008 — Contrato web ↔ API pelo OpenAPI, com tipos gerados

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
Com a API em Python e o front em TypeScript ([0001](0001-arquitetura-web-api.md)), os tipos não são compartilhados naturalmente. Tipos escritos à mão nos dois lados divergem em silêncio, e agentes de IA tendem a "adivinhar" o formato das respostas.

## Decisão
- Os **schemas Pydantic** da API são a fonte de verdade do contrato. O FastAPI publica o OpenAPI em `/openapi.json`.
- O web gera os tipos com **openapi-typescript** e usa **openapi-fetch** como cliente HTTP tipado. O script `pnpm gen:api` regenera os tipos.
- O arquivo gerado é **versionado**, e o CI falha se ele estiver desatualizado em relação à API.
- **Erros** seguem um formato único, com status HTTP e corpo `{ "code": "...", "message": "..." }`. O `code` é estável, e regras violadas usam o identificador da RN quando faz sentido (ex.: `RN-14_PRAZO_EXPIRADO`). A `message` vem em português, pronta para mostrar ao usuário.

## Alternativas consideradas
- **Tipos escritos à mão no front:** divergem com o tempo.
- **tRPC ou GraphQL:** não se encaixam bem numa API Python.

## Consequências
- Mudar um schema na API exige rodar `pnpm gen:api` no mesmo PR. Se não rodar, o CI avisa.
- O front ganha autocomplete e erro de compilação quando o contrato muda.
