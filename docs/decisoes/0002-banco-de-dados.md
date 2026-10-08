# 0002 — PostgreSQL + SQLAlchemy 2 + Alembic

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
O domínio é relacional (barbeiros, serviços, clientes, agendamentos, pagamentos). A regra mais crítica do sistema é a **RN-08**: nunca pode haver dois agendamentos ativos que se cruzem para o mesmo barbeiro, nem com concorrência.

## Decisão
- **Banco: PostgreSQL** (no Docker em dev, gerenciado pela Railway em produção, [0005](0005-hospedagem.md)).
- **Acesso a dados: SQLAlchemy 2.x**, com mapeamento declarativo tipado (`Mapped[...]`), e **Alembic** para as migrações.
- **A RN-08 é garantida pelo banco**, com uma *exclusion constraint* (`btree_gist`) sobre `(barber_id, tstzrange(start, end))`, válida só para agendamentos com status `SCHEDULED`. Inserções concorrentes conflitantes falham no banco, e a API traduz o erro para "horário não está mais disponível". Os bloqueios (`TimeBlock`) também são checados na transação.
- Os horários ficam em `timestamptz`. A conversão para `America/Sao_Paulo` (RN-01) acontece nas bordas: entrada, exibição e e-mail.
- Os valores monetários ficam em `numeric(10,2)`, nunca em `float`.
- **Cada migração é revisada no PR.** Nada de alterar o schema fora do Alembic.
- As tabelas de autenticação do Better Auth ficam no mesmo banco, criadas e gerenciadas por ele ([0003](0003-autenticacao.md)). O Alembic **ignora** essas tabelas.

## Alternativas consideradas
- **SQLModel:** menos código repetido (Pydantic + SQLAlchemy juntos), mas abstrai demais o SQLAlchemy, que é justamente o que vale aprender, e ainda é menos maduro.
- **Garantir a RN-08 só na aplicação** (consulta antes de inserir): sujeito a condição de corrida entre requisições simultâneas.
- **MySQL** (usado no projeto acadêmico): não tem exclusion constraints com intervalos.

## Consequências
- A sobreposição de horários fica impossível mesmo com um bug na aplicação.
- Os testes da API precisam de um PostgreSQL real (o do `docker compose` ou um container de teste). O SQLite não serve, porque não tem `tstzrange` nem `btree_gist`.
- Dois donos de schema no mesmo banco (Alembic e Better Auth) exigem disciplina: o `env.py` do Alembic filtra as tabelas do Better Auth.
