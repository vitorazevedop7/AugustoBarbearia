# Arquitetura

Como o sistema é organizado, onde cada coisa mora e como as peças conversam. **As justificativas das escolhas** estão nos ADRs em [decisoes/](decisoes/), e aqui só aparece o link para elas.

## Visão geral

```mermaid
flowchart LR
    U[Navegador<br/>cliente / administração]
    subgraph Railway
        W[web<br/>Next.js + Better Auth]
        A[api<br/>FastAPI]
        J[jobs<br/>cron de hora em hora]
        D[(PostgreSQL)]
    end
    G[Google OAuth]
    R[Resend<br/>e-mail]

    U -- HTTPS --> W
    W -- login --> G
    W -- "Bearer JWT (rede privada)" --> A
    W -- tabelas do Better Auth --> D
    A -- SQLAlchemy --> D
    A -- envia --> R
    J -- lembretes --> D
    J -- envia --> R
    A -. busca JWKS .-> W
```

- **web**: renderiza as telas e é o **BFF**. É o único serviço público ([0001](decisoes/0001-arquitetura-web-api.md)).
- **api**: concentra **todas** as regras de negócio (`RN-xx`) e as tabelas de domínio.
- **jobs**: a mesma imagem da API, rodando o comando de lembretes por cron ([0006](decisoes/0006-email-e-jobs.md)).
- **PostgreSQL**: um banco, com dois donos de schema. O Alembic cuida das tabelas de domínio e o Better Auth das tabelas de autenticação ([0002](decisoes/0002-banco-de-dados.md)).

## Fluxo de uma requisição autenticada

```mermaid
sequenceDiagram
    participant B as Navegador
    participant W as web (Next.js)
    participant A as api (FastAPI)
    participant D as PostgreSQL

    B->>W: ação (ex.: confirmar agendamento) com cookie de sessão
    W->>W: Better Auth valida a sessão e emite JWT (15 min)
    W->>A: POST /me/appointments + Authorization: Bearer JWT
    A->>A: valida o JWT (JWKS) e resolve o papel (ADMIN_EMAILS → admin, senão cliente)
    A->>D: transação: regras (RN-05, RN-11…) + insert
    D-->>A: ok, ou violação da exclusion constraint (RN-08)
    A-->>W: 201 + agendamento, ou erro {code, message}
    W-->>B: tela atualizada ou mensagem de erro
    A--)A: depois do commit, envia o e-mail de confirmação (RN-50)
```

Detalhes da autenticação: [0003](decisoes/0003-autenticacao.md).

## API (`/api`)

O esqueleto da S2.02 está implementado em [esqueleto-api.md](specs/esqueleto-api.md): criação da app, settings, handlers de erro e healthcheck tipado. Banco, autenticação e módulos de domínio entram nas issues seguintes. As pastas abaixo mostram a estrutura alvo; `app/health.py` contém o router de saúde sem dependências externas.

### Estrutura de pastas

```
api/
├── pyproject.toml / uv.lock
├── Dockerfile
├── alembic.ini
├── alembic/                  # migrações (só tabelas de domínio)
├── app/
│   ├── main.py               # cria o FastAPI e registra os routers
│   ├── config.py             # settings (pydantic-settings, lê env)
│   ├── health.py             # router e schema de GET /health
│   ├── db.py                 # engine, sessão, base declarativa
│   ├── errors.py             # erro de domínio → {code, message} (0008)
│   ├── auth/                 # validação do JWT, dependências current_user / require_admin
│   ├── modules/              # um pacote por área do domínio
│   │   ├── shop/             # Barbearia + horário de funcionamento
│   │   ├── barbers/          # Barbeiro, Barbeiro–Serviço
│   │   ├── catalog/          # Serviço (o nome evita confusão com service.py)
│   │   ├── customers/        # Cliente e vínculo com a conta
│   │   ├── availability/     # cálculo de horários disponíveis (RN-05) e bloqueios
│   │   ├── appointments/     # agendamento e ciclo de vida (RN-10 a RN-33)
│   │   ├── payments/         # conclusão, pagamento e relatório (RN-40 a RN-44)
│   │   └── notifications/    # registro e envio de e-mail, templates (RN-50 a RN-54)
│   └── jobs/
│       └── send_reminders.py # python -m app.jobs.send_reminders
└── tests/                    # espelha app/modules; usa o Postgres do compose
```

Cada módulo segue o mesmo formato:

| Arquivo | Responsabilidade |
|---|---|
| `router.py` | HTTP: rotas, parse e validação de formato (Pydantic), dependências de auth. **Sem regra de negócio** |
| `schemas.py` | Modelos Pydantic de entrada e saída. Geram o OpenAPI ([0008](decisoes/0008-contrato-openapi.md)) |
| `service.py` | **Regras de negócio** e transações. Cita as `RN-xx` em comentários e docstrings |
| `models.py` | Tabelas SQLAlchemy |

### Onde cada tipo de regra mora

| Tipo | Onde | Exemplo |
|---|---|---|
| Formato e obrigatoriedade de campos | `schemas.py` (Pydantic) | Telefone obrigatório, preço ≥ 0 |
| Regra de negócio | `service.py` | Prazo de 2h para cancelar (RN-14), limite de 2 agendamentos (RN-11) |
| Cálculo puro | Função sem I/O em `availability/` | Grade e slots (RN-04, RN-05), testável sem banco |
| Invariante crítica | Constraint no banco | Sem sobreposição (RN-08) |
| Permissão | Dependência de auth no `router.py` | `require_admin` nas rotas `/admin` (RN-70) |

### Grupos de rotas

Os prefixos deixam a permissão explícita (RN-70):

| Prefixo | Quem acessa | Conteúdo |
|---|---|---|
| `/public` | Qualquer um, sem token | Dados da barbearia, serviços e barbeiros ativos, horários disponíveis |
| `/me` | Cliente autenticado | Perfil, os próprios agendamentos (criar, remarcar, cancelar) |
| `/admin` | Administração | Agenda, agendamento manual, bloqueios, conclusão, falta, cadastros, relatório |
| `/health` | Railway | Healthcheck |

## Web (`/web`)

### Estrutura de pastas

```
web/
├── package.json / pnpm-lock.yaml
├── Dockerfile
└── src/
    ├── app/
    │   ├── (publico)/              # vitrine: /, /servicos, /barbeiros, /privacidade
    │   ├── (cliente)/              # exige login: /agendar, /meus-agendamentos, /perfil
    │   ├── admin/                  # exige admin: /admin/agenda, /admin/clientes, /admin/cadastros, /admin/relatorio
    │   └── api/auth/[...all]/      # handler do Better Auth
    ├── lib/
    │   ├── auth.ts                 # configuração do Better Auth (Google + plugin JWT)
    │   └── api/
    │       ├── client.ts           # openapi-fetch com o Bearer JWT
    │       └── schema.d.ts         # GERADO por `pnpm gen:api`, não editar
    └── components/
        └── ui/                     # componentes base da identidade visual
```

### Regras do front

- **Server Components** buscam dados pela API. **Server Actions** fazem as mutações chamando a API. O navegador nunca chama a API diretamente.
- **Nenhuma regra de negócio no front.** Validação no front é só para a experiência do usuário; quem decide é a API, e o front mostra o `message` do erro que a API devolve.
- O acesso às rotas `(cliente)` e `admin` é checado no servidor (middleware ou layout). Mesmo assim, a API valida tudo de novo.
- Mobile first: toda tela precisa funcionar bem em 360px de largura.

## Ambientes

| Ambiente | Como sobe | Banco |
|---|---|---|
| Desenvolvimento | `docker compose up` ([0004](decisoes/0004-docker.md)) | Postgres do compose |
| Produção | Push na `main` → deploy na Railway ([0005](decisoes/0005-hospedagem.md)) | Postgres da Railway |

Não há ambiente de homologação no MVP.

### Serviços na Railway

| Serviço | Imagem | Comando | Público? |
|---|---|---|---|
| `web` | `/web/Dockerfile` | `node server.js` (Next standalone) | Sim (domínio) |
| `api` | `/api/Dockerfile` | `alembic upgrade head && uvicorn app.main:app` | Não (rede privada) |
| `jobs` | `/api/Dockerfile` | `python -m app.jobs.send_reminders`, cron `0 * * * *` | Não |
| `postgres` | Gerenciado | — | Não |

## Variáveis de ambiente

Só os **nomes**. Os valores ficam no `.env` local (não versionado) e nas variáveis da Railway. `api/.env.example` lista a configuração opcional já usada pelo esqueleto; o `.env.example` da raiz com as integrações será entregue com o Compose (#26).

| Variável | Serviço | Para quê |
|---|---|---|
| `APP_NAME` | api | Opcional: título do OpenAPI; padrão "Augusto Barbearia API" |
| `DATABASE_URL` | api, jobs, web | Conexão com o PostgreSQL |
| `ADMIN_EMAILS` | api | Lista de e-mails da administração (RN-71) |
| `AUTH_JWKS_URL` | api, jobs | Endpoint JWKS do Better Auth |
| `AUTH_ISSUER` / `AUTH_AUDIENCE` | api | Conferência do JWT |
| `RESEND_API_KEY` | api, jobs | Envio de e-mail |
| `EMAIL_FROM` | api, jobs | Remetente dos e-mails |
| `WEB_BASE_URL` | api, jobs | Links nos e-mails (ex.: "Meus agendamentos") |
| `BETTER_AUTH_SECRET` | web | Assinatura da sessão |
| `BETTER_AUTH_URL` | web | URL pública do site |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | web | Login com Google |
| `API_INTERNAL_URL` | web | Endereço da API na rede privada |
