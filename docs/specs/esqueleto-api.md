# Spec — Esqueleto da API

- **Issue:** #24 (S2.02)
- **Fase:** 0 (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
A API concentra as regras do sistema e precisa de uma base pequena e verificável que sirva de referência para os módulos futuros. Esta entrega prepara a aplicação FastAPI, o contrato de erros e as ferramentas de qualidade, sem implementar fluxos do MVP.

## Quem usa
Equipe de desenvolvimento e infraestrutura. Visitantes, clientes e administração serão atendidos pelos módulos posteriores.

## Histórias
- Como pessoa desenvolvedora, quero iniciar e verificar a API com comandos reproduzíveis para implementar os próximos módulos com o mesmo padrão.
- Como infraestrutura, quero consultar a saúde do processo para identificar se o servidor responde.

## Regras envolvidas
Nenhuma RN é implementada nesta fundação. São respeitados os ADRs [0001](../decisoes/0001-arquitetura-web-api.md), [0004](../decisoes/0004-docker.md), [0007](../decisoes/0007-qualidade-e-testes.md) e [0008](../decisoes/0008-contrato-openapi.md).

## Critérios de aceite

**CA-1 — Saúde do processo**
- **Dado** que a aplicação iniciou, sem banco ou autenticação configurados,
- **Quando** chega `GET /health`,
- **Então** responde HTTP 200 com exatamente `{ "status": "ok" }`, descrito no OpenAPI.

**CA-2 — Erro de domínio**
- **Dado** um erro de domínio com status HTTP, código estável e mensagem em português,
- **Quando** uma rota levanta esse erro,
- **Então** o handler global preserva o status e responde somente `{ "code", "message" }`.

**CA-3 — Erros de transporte e validação**
- **Dado** um caminho inexistente, método não permitido ou entrada inválida,
- **Quando** a requisição chega à aplicação,
- **Então** o erro também usa `{ "code", "message" }`, com mensagem em português e status apropriado.

**CA-4 — Configuração e ferramentas**
- **Dado** um checkout com uv instalado,
- **Quando** as dependências são sincronizadas pelo lockfile e os comandos de qualidade rodam,
- **Então** pytest, Ruff (lint e formato) e Pyright passam, com tipagem strict em `app/`; settings leem o ambiente sem exigir integrações ainda não implementadas.

**CA-5 — Imagem executável**
- **Dado** Docker disponível,
- **Quando** a imagem multi-stage é construída e iniciada,
- **Então** executa Uvicorn como usuário não-root, sem ferramentas de desenvolvimento na imagem final, e responde em `/health`.

## Fluxo e telas
Sem telas. A infraestrutura consulta `/health`; o desenvolvimento usa `/docs` e `/openapi.json` para inspecionar o contrato. Não há consulta ao banco no healthcheck.

## API
- `GET /health`: sem autenticação; resposta tipada com `status` literal `ok`.
- `/docs`, `/redoc` e `/openapi.json`: documentação padrão do FastAPI.
- Erros de domínio usam a classe `DomainError`; handlers globais normalizam erros HTTP e de validação. Não há rota artificial de erro em produção: os testes registram rotas somente na app de teste.

## Fora do escopo desta spec
Banco, modelos de domínio, Alembic, autenticação, e-mails, regras de agendamento, Docker Compose e cliente HTTP do web com tipos gerados. Essas entregas têm issues próprias.

## Dúvidas em aberto
Nenhuma.
