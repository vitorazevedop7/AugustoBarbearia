# Spec — Banco na API

- **Issue:** #27 (S2.05)
- **Fase:** 0
- **Status:** implementada

## Contexto
A API precisa de conexão, sessões e migrações antes dos módulos de domínio. Segue o ADR 0002; o PostgreSQL já sobe pelo Compose (#26).

## Quem usa
Mantenedores e ferramentas de monitoramento.

## Histórias
- Como mantenedor, quero evoluir o schema pelo Alembic sem alterar tabelas de autenticação.
- Como mantenedor, quero testes contra Postgres isolados dos dados de desenvolvimento.

## Regras envolvidas
- RN-08: prepara `btree_gist`; a constraint fica para a funcionalidade de agendamento.

## Critérios de aceite
**CA-1 — Migração inicial**
- Dado um banco novo, quando executo `alembic upgrade head`, então `btree_gist` fica ativa, sem criar entidades de domínio. Reexecutar é seguro.

**CA-2 — Dois donos de schema**
- Dadas as tabelas `user`, `session`, `account`, `verification` e `jwks`, quando o Alembic compara o schema, então não propõe modificá-las ou excluí-las, mas continua detectando diferenças de domínio.

**CA-3 — Saúde do banco**
- Dado um banco acessível, quando consulto `/health`, então recebo 200 e `{"status":"ok"}` após executar `SELECT 1`.
- Dado um banco indisponível, então recebo 503 com `code=DATABASE_UNAVAILABLE` e mensagem em português, sem detalhes de conexão.

**CA-4 — Isolamento dos testes**
- Dada a configuração de desenvolvimento, quando executo pytest, então as fixtures criam (se necessário) um banco com sufixo `_test` no mesmo servidor e aplicam migrações uma vez por sessão.
- Dado um teste que chama commit ou rollback, quando ele termina, então sua transação externa é desfeita. As requisições do fixture `client` usam a mesma sessão isolada.

**CA-5 — Sessão por requisição**
- Dada uma requisição, quando ela termina ou falha, então a sessão é fechada e alterações sem commit são desfeitas. O service decide o commit.

## Fluxo e telas
Sem telas. `DATABASE_URL` é obrigatória na API. URLs `postgresql://` e `postgres://` são normalizadas para `postgresql+psycopg://` somente na API; o web mantém sua URL original. Conexões têm timeout de 5 segundos e pool com verificação de conexão.

## API
`GET /health`: público, retorna 200 ou 503 no contrato do ADR 0008.

## Fora do escopo desta spec
Entidades de domínio, autenticação, RN-08 completa, CI, deploy e geração do cliente tipado (#29). Migrações no desenvolvimento são explícitas, não executadas pelo healthcheck.

## Dúvidas em aberto
Nenhuma.
