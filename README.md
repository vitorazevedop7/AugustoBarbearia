# Augusto Barbearia

Sistema web de agendamento e gestão para a Augusto Barbearia.

- **Cliente:** vê os serviços e os barbeiros, agenda com a conta Google, remarca e cancela, e recebe confirmação e lembrete por e-mail.
- **Administração:** agenda de todos os barbeiros, agendamento por telefone ou balcão, conclusão de atendimento com pagamento, cadastros e relatório financeiro.

> Em desenvolvimento: Fase 1 (MVP). Ver o [roadmap](docs/produto/roadmap.md).

## Stack

Next.js (web) · FastAPI (api) · PostgreSQL · Docker · Railway. Detalhes e motivos em [docs/decisoes](docs/decisoes/).

## Rodando localmente

Pré-requisito: Docker.

```bash
cp .env.example .env     # preencha as variáveis
docker compose up
```

- Web: http://localhost:3000
- API: http://localhost:8000 (documentação interativa em `/docs`)

> O setup do código acontece na Fase 0. Até lá, este repositório só tem documentação.

## Documentação

Tudo está em [`docs/`](docs/). Para começar, leia a [visão do produto](docs/produto/visao.md), as [regras de negócio](docs/dominio/regras.md) e a [arquitetura](docs/arquitetura.md). Agentes de IA começam pelo [CLAUDE.md](CLAUDE.md).
