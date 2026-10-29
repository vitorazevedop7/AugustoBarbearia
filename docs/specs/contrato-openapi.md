# Spec — Contrato OpenAPI e tipos gerados no web

- **Issue:** #29 (S2.07)
- **Fase:** 0 (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
O [ADR 0008](../decisoes/0008-contrato-openapi.md) define que os schemas Pydantic da API são a fonte de verdade do contrato e que o web usa tipos gerados, nunca escritos à mão. Esta entrega liga as duas pontas e faz o CI barrar um contrato desatualizado.

## Quem usa
Mantenedores e agentes, ao mudar a API ou ao chamar a API pelo web.

## Histórias
- Como mantenedor, quero gerar os tipos do web a partir da API com um comando, para não escrever tipos à mão.
- Como mantenedor, quero que o CI falhe quando alguém muda um schema da API e esquece de regenerar os tipos, para o contrato não divergir em silêncio.
- Como mantenedor, quero ver na página inicial, em desenvolvimento, se o web consegue falar com a API.

## Regras envolvidas
Nenhuma regra de negócio. Segue os ADRs 0001 (o navegador não chama a API) e 0008.

## Critérios de aceite
**CA-1 — Exportação sem servidor**
- **Dado** a API instalada, com `DATABASE_URL` preenchida (nenhuma conexão é aberta)
- **Quando** rodo `uv run python -m app.export_openapi [arquivo]`
- **Então** o OpenAPI sai em JSON (UTF-8, indentado, terminado em quebra de linha) no arquivo ou, sem argumento, na saída padrão. A saída é igual ao `/openapi.json` e é determinística.

**CA-2 — Geração dos tipos**
- **Dado** o web instalado
- **Quando** rodo `pnpm gen:api [arquivo-ou-url]`
- **Então** `src/lib/api/schema.d.ts` é regenerado com openapi-typescript. Sem argumento, a fonte é `$API_INTERNAL_URL/openapi.json` (padrão `http://localhost:8000`, e `http://api:8000` no compose). Um caminho de arquivo é relativo a `web/`. O arquivo é versionado e fica fora do ESLint e do Prettier.

**CA-3 — Cliente tipado**
- **Dado** `API_INTERNAL_URL` configurada
- **Quando** o servidor do web chama `createApiClient({ token })`
- **Então** recebe um cliente openapi-fetch tipado por `schema.d.ts`, que envia `Authorization: Bearer <token>` quando há token. Sem `API_INTERNAL_URL`, falha com "API_INTERNAL_URL não está configurada.".

**CA-4 — Prova de vida**
- **Dado** o sistema rodando com `docker compose up`
- **Quando** acesso `/`
- **Então** uma faixa discreta antes do rodapé mostra "API: ok". Enquanto espera, mostra "API: verificando…" em cor neutra. Com a API fora do ar, mostra "API: inacessível"; com erro da API, mostra o `message` dela, ou `HTTP <status>` se o corpo não for o JSON de erro. Fora de desenvolvimento, a faixa não aparece.

**CA-5 — CI barra contrato desatualizado**
- **Dado** um PR que muda um schema da API (ou o `schema.d.ts`) sem rodar `pnpm gen:api`
- **Quando** o CI roda
- **Então** o job `contract` regenera os tipos a partir da exportação e fica vermelho, mostrando a diferença.

## Fluxo e telas
- **API:** `app/export_openapi.py` usa `app.openapi()`, o mesmo documento servido em `/openapi.json`.
- **Web:** `scripts/gen-api.mjs` (o `pnpm gen:api`) usa a API Node do openapi-typescript e escreve um cabeçalho avisando que o arquivo é gerado.
- **Cliente:** `src/lib/api/client.ts` exporta `createApiClient` e o tipo `ApiClient`. O token vem de `getApiToken()` (`src/lib/api/token.ts`). A API passa a validar o JWT na #31.
- **Status:** `src/components/api-status.tsx` chama `GET /health` com timeout de 3 segundos, dentro de um `Suspense` ("verificando…"), para não travar a página.
- **CI:** o job `contract` roda quando `api/`, `web/` ou o workflow mudam. Ele instala a API sem dependências de desenvolvimento, exporta o OpenAPI para um arquivo temporário, roda `pnpm gen:api` com esse arquivo e falha se `web/src/lib/api/schema.d.ts` ficar diferente do commitado.

## API
Nenhuma rota nova. O contrato publicado continua em `/openapi.json`.

## Fora do escopo desta spec
- Validação do JWT na API e uso do token nas chamadas reais (#31).
- Telas que consomem rotas de domínio.

## Dúvidas em aberto
Nenhuma.
