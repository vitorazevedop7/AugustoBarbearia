# 0001 — Next.js (web) + FastAPI (API) em monorepo

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
O sistema tem dois lados (cliente e administração, D2) e um núcleo de regras de negócio relevante: disponibilidade, ciclo de vida do agendamento e financeiro (ver `regras.md`). Uma pessoa vai mantê-lo, com apoio de agentes de IA. O Vitor quer **aprender Python** neste projeto e já domina React e Next.js.

## Decisão
- **API de domínio em Python com FastAPI.** Todas as regras de negócio (`RN-xx`) vivem aqui, e a API é a única que fala com as tabelas de domínio.
- **Front-end em Next.js (App Router, TypeScript),** que também funciona como **BFF**. O navegador fala só com o Next. O Next, no servidor, chama a API passando o token do usuário (ver [0003](0003-autenticacao.md)).
- **Monorepo:**
  ```
  /api    → FastAPI (Python)
  /web    → Next.js (TypeScript)
  /docs   → documentação
  docker-compose.yml
  ```
- **O contrato entre web e API é o OpenAPI gerado pelo FastAPI.** Os tipos TypeScript do cliente HTTP são gerados a partir dele, e não escritos à mão (ver [0008](0008-contrato-openapi.md)).

## Alternativas consideradas
- **Next.js full-stack (só TypeScript):** um projeto só e menos peças, mas não atende o objetivo de aprender Python.
- **Django + HTMX:** um monolito Python bem produtivo (ORM, admin e auth embutidos), mas abandona o React e não ensina o modelo de API moderna e assíncrona.
- **Django REST + Next.js:** a mesma divisão desta decisão, com um backend mais pesado do que o domínio precisa.

## Consequências
- O domínio fica isolado e testável em Python puro, e o front pode mudar sem tocar nas regras.
- São **dois projetos, duas toolchains e dois containers**. O `docker compose` sobe tudo com um comando ([0004](0004-docker.md)).
- **A regra de negócio não pode ficar no front.** O Next só valida para melhorar a experiência; quem decide é a API.
- A autenticação atravessa as duas camadas. Ver [0003](0003-autenticacao.md).
