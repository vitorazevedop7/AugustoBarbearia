# Spec — Esqueleto do web

- **Issue:** #25 (S2.03)
- **Fase:** 0 (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
A base Next.js estabelece a estrutura que as próximas telas vão seguir. Os tokens, as fontes e o layout compartilhado preservam a identidade da Augusto Barbearia desde a primeira página.

## Quem usa
Visitante, cliente e administração; nesta etapa todos veem somente a página pública em construção.

## Histórias
- Como visitante, quero reconhecer a Augusto Barbearia e saber que o site está em construção.
- Como mantenedor, quero comandos reproduzíveis e tokens visuais compartilhados para implementar as próximas telas.

## Regras envolvidas
Esta fundação não implementa regras de negócio. Respeita a separação web/API do ADR 0001, a identidade visual e as ferramentas dos ADRs 0004 e 0007.

## Critérios de aceite
**CA-1 — Página inicial**
- **Dado** o web instalado, **quando** acesso `/`, **então** vejo cabeçalho com logo e nome, título “Em construção” e rodapé em português.

**CA-2 — Identidade e acessibilidade**
- **Dado** um viewport de 360px, **quando** acesso `/`, **então** todo o conteúdo cabe sem rolagem horizontal, o logo fica sobre fundo claro, os títulos usam Playfair Display e a interface usa Inter, com as cores vindas dos tokens documentados.

**CA-3 — Qualidade e build**
- **Dado** Node.js e pnpm compatíveis, **quando** instalo com o lockfile e executo `lint`, `typecheck`, `test` e `build`, **então** todos passam e o build gera `.next/standalone/server.js`.

**CA-4 — Imagem de produção**
- **Dado** Docker disponível, **quando** construo e executo a imagem, **então** a aplicação responde na porta 3000 com usuário não-root.

## Fluxo e telas
Uma página pública estática, renderizada no servidor, com cabeçalho, conteúdo “Em construção” e rodapé. Não há carregamento assíncrono nem chamadas de API nesta etapa. As pastas `(cliente)` e `admin` ficam reservadas, sem páginas ou proteção fictícias. A validação inclui um teste de renderização da página, os comandos de qualidade e a inspeção visual em 360px.

Direção visual: composição sóbria, fundo paper, logo em superfície clara, tipografia editorial e um único acento brand. Conteúdo: cabeçalho, estado em construção e rodapé. Interações: foco visível e transição curta nos links; sem animação ornamental em uma página de estado estática.

## API
Nenhuma rota de API, autenticação ou cliente HTTP nesta etapa.

## Fora do escopo desta spec
Vitrine, agendamento, autenticação, integrações, geração do contrato OpenAPI, Docker Compose e CI pertencem às issues seguintes.

## Dúvidas em aberto
Nenhuma.
