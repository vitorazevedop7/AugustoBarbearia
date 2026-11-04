# Augusto Barbearia

Sistema web de agendamento e gestão para a Augusto Barbearia.

- **Cliente:** vê os serviços e os barbeiros, agenda com a conta Google, remarca e cancela, e recebe confirmação e lembrete por e-mail.
- **Administração:** agenda de todos os barbeiros, agendamento por telefone ou balcão, conclusão de atendimento com pagamento, cadastros e relatório financeiro.

> Em desenvolvimento: Fase 0 (fundação do MVP). Ver o [roadmap](docs/produto/roadmap.md).

## Stack

Next.js (web) · FastAPI (api) · PostgreSQL · Docker · Railway. Detalhes e motivos em [docs/decisoes](docs/decisoes/).

## Rodando localmente

O caminho recomendado é o [sistema completo](#sistema-completo-recomendado) com Docker Compose. Também dá para rodar a API ou o web direto na máquina, como abaixo.

### API

Pré-requisito: [uv](https://docs.astral.sh/uv/getting-started/installation/). A versão Python 3.14.10 está fixada em `api/.python-version` e no `pyproject.toml`; o uv pode instalá-la automaticamente.

```bash
cd api
cp .env.example .env
uv sync --locked
uv run uvicorn app.main:app --reload
```

- Saúde: http://localhost:8000/health → `{ "status": "ok" }`
- Documentação: http://localhost:8000/docs
- OpenAPI: http://localhost:8000/openapi.json

Copie `api/.env.example` para `api/.env` e configure `DATABASE_URL`. A API exige PostgreSQL acessível; `APP_NAME` personaliza opcionalmente o título da documentação.

Na pasta `api/`, rode as verificações:

```bash
uv run pytest
uv run ruff check .
uv run ruff format --check .
uv run pyright
```

Para exportar o contrato OpenAPI sem subir o servidor (usado pelo `pnpm gen:api` e pelo CI): `uv run python -m app.export_openapi /tmp/openapi.json`. Sem o argumento, o JSON vai para a saída padrão.

Para formatar: `uv run ruff format .`. O Pyright verifica `app/` em modo strict. Os testes usam o cliente HTTP do FastAPI e um banco Postgres separado, criado pelas fixtures.

Para testar a imagem, na raiz do repositório:

```bash
docker build -t augusto-api ./api
docker run --rm --env-file api/.env -p 8000:8000 augusto-api
```

No `api/.env` passado ao Docker, use um host acessível pelo container (por exemplo, `host.docker.internal` no Docker Desktop). A imagem final executa Uvicorn com usuário não-root e inclui somente dependências de execução. Consulte `/health` para confirmar o funcionamento.

### Web

Use Node.js 24 LTS e pnpm 10.34.9 (versão fixada em `web/package.json`).

```bash
cd web
pnpm install --frozen-lockfile
pnpm dev
```

Qualidade: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`. O build baixa Inter e Barlow do Google Fonts e gera a saída standalone.

Os tipos da API ficam em `src/lib/api/schema.d.ts`, gerado e versionado ([ADR 0008](docs/decisoes/0008-contrato-openapi.md)). Mudou um schema da API? Regenere no mesmo PR:

```bash
pnpm gen:api                       # lê $API_INTERNAL_URL/openapi.json (padrão http://localhost:8000)
pnpm gen:api /tmp/openapi.json     # ou um arquivo exportado pela API
```

O web chama a API só pelo servidor, com `createApiClient()` de `src/lib/api/client.ts`, que usa `API_INTERNAL_URL` e obtém automaticamente o JWT da sessão com `getApiToken()` em cada requisição. Sem sessão, a chamada segue sem Bearer, permitindo rotas públicas. Fora do compose, defina `API_INTERNAL_URL=http://localhost:8000` em `web/.env.local`.

Para testar a imagem de produção, execute na raiz:

```bash
docker build -t augusto-web ./web
docker run --rm -p 3000:3000 augusto-web
```

### Sistema completo (recomendado)

Pré-requisito: Docker com o Compose v2. Na raiz do repositório:

```bash
cp .env.example .env
docker compose up
```

- Web: http://localhost:3000
- API: http://localhost:8000/health e http://localhost:8000/docs
- PostgreSQL 17: `localhost:5432` (só na própria máquina), com usuário, senha e banco do `.env`

**Login com Google.** Na primeira vez, e quando o Better Auth for atualizado, crie as tabelas de autenticação:

```bash
docker compose exec web pnpm auth:migrate
```

Para o login funcionar, preencha no `.env` o `BETTER_AUTH_SECRET` (`openssl rand -base64 32`) e as credenciais OAuth do Google (`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET`), com `http://localhost:3000/api/auth/callback/google` como URI de redirecionamento autorizado. Depois, `docker compose up -d web` aplica as variáveis.

**Acesso à administração.** Preencha `ADMIN_EMAILS` no `.env` com os e-mails Google autorizados, separados por vírgulas. A API compara os e-mails sem distinguir maiúsculas/minúsculas e ignora espaços nas extremidades. Mantenha `AUTH_ISSUER` e `AUTH_AUDIENCE` iguais no web e na API; `AUTH_JWKS_URL` aponta para `http://web:3000/api/auth/jwks` dentro do Compose (fora dele, `http://localhost:3000/api/auth/jwks`). Aplique a configuração:

```bash
docker compose up -d api web
docker compose exec api uv run pytest tests/test_auth.py
```

Entre com Google e abra http://localhost:3000/admin: um e-mail da lista vê “Acesso permitido”; outra conta é redirecionada para `/`. Sem sessão, o destino é `/entrar?voltar=/admin`. Se a sessão existe, mas a API rejeita o JWT (ex.: JWKS indisponível), a página mostra um aviso sem entrar em ciclo de redirecionamentos. `GET /me` retorna `sub`, `email`, `name`, `role` (`admin` ou `customer`) e `has_phone` do usuário autenticado; `GET /admin/ping` retorna `{ "status": "ok" }` apenas para administradores. Ambos recebem Bearer JWT e recusam credenciais inválidas com 401; a rota administrativa retorna 403 para clientes. Os testes de auth geram chaves locais e simulam JWKS, sem depender de Google ou do web. Detalhes na [spec de autenticação](docs/specs/autenticacao-api.md).

**Perfil do cliente.** Depois de `docker compose exec api alembic upgrade head`, entre com uma conta Google fora de `ADMIN_EMAILS` e abra http://localhost:3000/perfil. O primeiro acesso cria o cadastro de cliente com o nome e o e-mail do Google, ou o vincula a um cadastro com o mesmo e-mail (RN-23). Informe o telefone com DDD e salve; `GET /me` passa a indicar `has_phone: true`. Detalhes na [spec do perfil](docs/specs/perfil-cliente.md).

**Cadastro de barbeiros.** Depois de `docker compose exec api alembic upgrade head`, entre com uma conta de `ADMIN_EMAILS` e abra http://localhost:3000/admin/cadastros/barbeiros. Edvaldo, Lauro e Manoel já aparecem com fotos fictícias em 4:5, que não retratam os proprietários (D10; as fotos reais são a pendência P10). A migração preserva fotos já definidas pela administração. Crie um barbeiro, edite a apresentação (até 400 caracteres) e mude a situação para Inativo; ele continua na lista, depois dos ativos. Detalhes na [spec do cadastro de barbeiros](docs/specs/cadastro-barbeiros.md).

**Cadastro de serviços.** Com a conta de administração, abra http://localhost:3000/admin/cadastros/servicos. Corte Simples (30 min, R$ 25,00) e Corte + Barba (45 min, R$ 35,00) já aparecem, feitos pelos três proprietários (os preços reais são a pendência P9). Crie um serviço, escolha os barbeiros que o realizam e depois mude a situação para Inativo; ele continua na lista, depois dos ativos. Uma duração fora dos múltiplos de 5 (ou abaixo de 10 minutos), um preço negativo ou um serviço sem barbeiro voltam com a explicação da API. Detalhes na [spec do cadastro de serviços](docs/specs/cadastro-servicos.md).

**Vitrine.** Sem login, abra http://localhost:3000 numa largura de 360px: o hero com a chamada "Agendar horário", os serviços com preço e duração, a equipe (com as fotos fictícias dos proprietários) e o horário de funcionamento. O endereço e os contatos aparecem quando a administração os preenche em `/admin/cadastros/barbearia`. `/servicos` e `/barbeiros` listam tudo. Inative um serviço ou um barbeiro na administração e recarregue: ele some da vitrine. O "Agendar" leva a `/agendar`. Detalhes na [spec da vitrine](docs/specs/vitrine.md).

**Horários disponíveis.** Depois de `docker compose exec api alembic upgrade head`, consulte os horários livres de um barbeiro para um serviço, sem login: `curl "http://localhost:8000/public/availability?barber_id=1&service_id=2&date=AAAA-MM-DD"` (use uma data entre hoje e 30 dias à frente). A resposta traz os inícios de 30 em 30 minutos que cabem no expediente, com pelo menos 1 hora de antecedência e sem cruzar agendamentos ativos, no fuso de São Paulo. O banco recusa dois agendamentos ativos sobrepostos do mesmo barbeiro, mesmo com reservas simultâneas, e um barbeiro com agendamentos marcados não pode ser inativado. Detalhes na [spec de disponibilidade](docs/specs/disponibilidade.md).

**Agendamento.** Abra http://localhost:3000/agendar numa largura de 360px, sem login: escolha o barbeiro, o serviço (só os que ele faz), o dia e o horário, um toque por tela. Ao escolher o horário, o site pede o login com Google e volta para a confirmação. Sem telefone no perfil, a confirmação pede o telefone. Depois de confirmar, a página mostra o resumo e o link "Ver meus agendamentos". Um cliente pode ter no máximo 2 agendamentos marcados, e dois clientes nunca ficam com o mesmo horário. Detalhes na [spec do agendamento](docs/specs/agendamento-cliente.md).

**Meus agendamentos.** Logado como cliente, abra http://localhost:3000/meus-agendamentos: os próximos horários e o histórico. Até 2 horas antes do início, cada horário tem "Remarcar" (barbeiro, dia e horário, com as mesmas telas do agendamento) e "Cancelar" (com uma página de confirmação). Depois disso, o cartão mostra o contato da barbearia. Detalhes na [spec de meus agendamentos](docs/specs/meus-agendamentos.md).

A API espera o banco ficar saudável, e o web espera a API. O código de `api/` e `web/` é montado nos containers, então editar um arquivo recarrega o serviço. As dependências (`.venv` e `node_modules`) ficam dentro dos containers e não se misturam com as da sua máquina.

As verificações rodam nos próprios containers:

```bash
docker compose exec api uv run pytest
docker compose exec api sh -c "uv run ruff check . && uv run pyright"
docker compose exec web sh -c "pnpm lint && pnpm typecheck && pnpm test"
docker compose exec web pnpm gen:api   # regenera os tipos a partir da API do compose
```

Em desenvolvimento, a página inicial mostra o status da API (`GET /health`) numa faixa discreta antes do rodapé.

Depois de mudar `pyproject.toml`, `uv.lock`, `package.json` ou `pnpm-lock.yaml`, rode `docker compose up --build -V` para reconstruir as imagens e recriar os volumes de dependências. `docker compose down` para tudo; `docker compose down -v` também apaga os dados do banco.

O `.env.example` lista todas as variáveis do sistema; a explicação de cada uma está em [arquitetura.md](docs/arquitetura.md#variáveis-de-ambiente).

### Demonstração no notebook

Para apresentar o sistema, `scripts/demo.sh up` sobe uma cópia separada, com as imagens de produção, dados fictícios e um link `https://` público para abrir no celular (ADR 0010). O roteiro, inclusive o cadastro do link no Google, está em [docs/specs/demonstracao-local.md](docs/specs/demonstracao-local.md).

## CI

Todo PR, e todo push na `main`, roda o workflow [CI](.github/workflows/ci.yml) no GitHub Actions:
- **`api`:** `ruff check`, `ruff format --check`, `pyright`, `alembic upgrade head` e `pytest`, contra um PostgreSQL 17;
- **`web`:** `lint`, `typecheck`, `test` e `build`;
- **`contract`:** exporta o OpenAPI da API, roda `pnpm gen:api` e falha se o `schema.d.ts` commitado estiver desatualizado.

Num PR, cada job só roda quando a pasta dele mudou (o `contract` roda se `api/` ou `web/` mudou). O job que não precisa rodar aparece como pulado e conta como aprovado. Na `main`, todos sempre rodam. PR com CI vermelho não é mergeado. Detalhes na [spec](docs/specs/ci.md).

## Documentação

Tudo está em [`docs/`](docs/). Para começar, leia a [visão do produto](docs/produto/visao.md), as [regras de negócio](docs/dominio/regras.md) e a [arquitetura](docs/arquitetura.md). Agentes de IA começam pelo [CLAUDE.md](CLAUDE.md).

## Banco e migrações

A API exige `DATABASE_URL`, normaliza a URL para Psycopg 3 e usa sessões SQLAlchemy 2. O `/health` consulta o banco: retorna 200 quando acessível ou 503 (`DATABASE_UNAVAILABLE`) quando indisponível. Fora do Compose, copie `api/.env.example` para `api/.env` e mantenha um Postgres acessível em `localhost:5432`.

```bash
docker compose exec api alembic upgrade head
docker compose exec api alembic check
docker compose exec api alembic revision --autogenerate -m "descricao"
```

A primeira migração habilita `btree_gist` (preparação para RN-08). Importe os futuros modelos em `api/alembic/env.py` e revise toda migração gerada. As tabelas `user`, `session`, `account`, `verification` e `jwks` pertencem ao Better Auth e são ignoradas pelo autogenerate. A imagem de produção inclui os arquivos do Alembic; aplicar migrações continua sendo um passo explícito.

`docker compose exec api uv run pytest` cria, se necessário, um banco com o nome de `DATABASE_URL` acrescido de `_test`, no mesmo servidor. O usuário precisa de `CREATEDB` (o usuário do Compose já tem). As migrações rodam uma vez por sessão de pytest; cada teste recebe uma transação com rollback, mesmo se chamar `commit()`. Use as fixtures `db_session` e `client`; não execute testes simultâneos contra o mesmo banco de teste. O banco de desenvolvimento não recebe as migrações ou os dados dos testes.
