# Módulos de domínio

Crie um pacote por área em `app/modules/<modulo>/`, conforme a [arquitetura](../../../docs/arquitetura.md#api-api):

| Arquivo | Responsabilidade |
|---|---|
| `router.py` | HTTP, schemas de entrada/saída e dependências de autenticação. Registre o router em `app/main.py`. |
| `schemas.py` | Modelos Pydantic que definem o contrato OpenAPI. |
| `service.py` | Regras de negócio e transações, citando as `RN-xx` envolvidas. Levante `DomainError` para erros esperados. |
| `models.py` | Tabelas SQLAlchemy; alterações de schema exigem migrações Alembic. |

Identificadores ficam em inglês; mensagens e documentação, em português do Brasil. Use `Decimal` para dinheiro e datas com fuso horário. Testes espelham os módulos em `tests/` e citam as RNs implementadas. Testes com persistência usarão o PostgreSQL do Compose; o healthcheck não depende de banco.

Não crie módulos vazios para funcionalidades futuras. Banco e autenticação entram nas suas próprias issues.
