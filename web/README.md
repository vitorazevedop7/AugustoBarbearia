# Web — Augusto Barbearia

Base Next.js com App Router, TypeScript strict, Tailwind e os tokens da [identidade visual](../docs/design/identidade-visual.md). O layout compartilhado usa Inter e Playfair Display via `next/font/google`; o download das fontes acontece no build e elas são servidas pelo próprio web em produção.

## Desenvolvimento

Use Node.js 24 LTS (também registrado em `.node-version`) e pnpm 10.34.9, versão fixada no `packageManager`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

A página inicial fica em http://localhost:3000. Em desenvolvimento, ela mostra o status da API (`GET /health`) numa faixa antes do rodapé; sem a API no ar, a faixa mostra "inacessível" e o resto da página funciona. Fora do compose, defina `API_INTERNAL_URL=http://localhost:8000` (por exemplo, em `web/.env.local`).

## Qualidade e produção

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm start
```

`lint` roda ESLint e verifica a formatação com Prettier; `pnpm format` aplica a formatação. `typecheck` gera os tipos de rota antes de executar o TypeScript, inclusive em checkout limpo. `test` executa Vitest uma vez; `pnpm test:watch` acompanha mudanças. `build` também copia os assets para a pasta standalone, permitindo executar `pnpm start` com o mesmo servidor usado no Docker.

Da raiz do repositório:

```bash
docker build -t augusto-web ./web
docker run --rm -p 3000:3000 augusto-web
```

A imagem final usa o build standalone e usuário não-root. O build precisa de acesso ao registro npm e ao Google Fonts.

## Estrutura

- `src/app/(publico)`: página inicial e futuras páginas públicas.
- `src/app/(cliente)` e `src/app/admin`: reservadas para as próximas telas, sem rotas publicadas nesta etapa.
- `src/app/api/auth/[...all]`: handler do Better Auth (callback do Google, `/api/auth/token`, `/api/auth/jwks`).
- `src/app/(publico)/entrar`: página de login, que também mostra os erros do Google.
- `src/lib/auth.ts`, `auth-jwt.ts`, `auth-actions.ts` e `session.ts`: login com Google, o JWT para a API, as Server Actions de entrar e sair e a sessão atual ([spec](../docs/specs/login-google.md)). As tabelas do Better Auth são criadas com `pnpm auth:migrate`.
- `src/lib/api/token.ts`: `getApiToken()`, o JWT da sessão atual para chamar a API.
- `src/lib/api/client.ts`: `createApiClient({ token })`, o cliente openapi-fetch tipado que chama `API_INTERNAL_URL`. Os tipos ficam em `src/lib/api/schema.d.ts`, gerado por `pnpm gen:api` e versionado; não edite à mão ([spec](../docs/specs/contrato-openapi.md)).
- `scripts/gen-api.mjs`: o `pnpm gen:api [arquivo-ou-url]`. Sem argumento, lê `$API_INTERNAL_URL/openapi.json` (padrão `http://localhost:8000`).
- `src/components`: cabeçalho, rodapé, `RevealObserver` (entrada dos elementos com `data-reveal` ao rolar) e `ApiStatus` (status de `GET /health` na página inicial, só em desenvolvimento).
- `src/app/design-system`: página `/design-system`, que renderiza os tokens e os componentes. Fica fora do menu e dos buscadores.
- `src/components/ui`: componentes do [design system](../docs/design/design-system.md) (`Button`, `ButtonLink`, `TextField`, `SelectField`, `ChoiceChip`, `Badge`, `StatusBadge`, `Alert`, `EmptyState`, `Ornament`, `SectionHeading`).
- `src/app/globals.css`: tokens CSS, escala `text-display-*`, `shadow-card`, a animação `rise` e o mapeamento do tema Tailwind. Componentes usam `bg-brand`, `text-ink`, `font-heading` e `font-sans`, sem cores literais. A linguagem visual está em [identidade-visual.md](../docs/design/identidade-visual.md).
