# Web — Augusto Barbearia

Base Next.js com App Router, TypeScript strict, Tailwind e os tokens da [identidade visual](../docs/design/identidade-visual.md). O layout compartilhado usa Inter e Playfair Display via `next/font/google`; o download das fontes acontece no build e elas são servidas pelo próprio web em produção.

## Desenvolvimento

Use Node.js 24 LTS (também registrado em `.node-version`) e pnpm 10.34.9, versão fixada no `packageManager`.

```bash
pnpm install --frozen-lockfile
pnpm dev
```

A página inicial fica em http://localhost:3000. Nesta etapa não há dependência de API ou banco.

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
- `src/app/api/auth/[...all]`: reservado ao handler de autenticação futuro.
- `src/lib/api`: reservado ao cliente HTTP e contrato gerado em uma etapa posterior.
- `src/components`: cabeçalho e rodapé compartilhados; `ui` reserva os componentes visuais básicos.
- `src/app/globals.css`: tokens CSS e mapeamento do tema Tailwind. Componentes usam `bg-brand`, `text-ink`, `font-heading` e `font-sans`, sem cores literais.
