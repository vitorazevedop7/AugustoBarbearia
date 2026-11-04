# Spec — Deploy de produção na Railway

- **Issue:** #32
- **Fase:** Produção na Railway, depois do aceite (ver [roadmap](../produto/roadmap.md))
- **Status:** pronta para implementar

## Contexto
Depois que os proprietários aceitarem o sistema, ele vai para a Railway no formato do [ADR 0005](../decisoes/0005-hospedagem.md) (`web`, `api`, `postgres` e `jobs`), no plano Hobby pago pela barbearia. A demonstração da apresentação não passa por aqui: ela roda no notebook ([ADR 0010](../decisoes/0010-demonstracao-local-com-tunel.md)). Esta spec é o passo a passo da montagem de produção. Boa parte dele é manual, no painel da Railway, no Google Cloud e no Resend.

## Quem usa
O mantenedor (Vitor), que executa os passos nos painéis. Nenhum usuário final.

## Histórias
- Como mantenedor, quero um passo a passo com os valores exatos de cada serviço, para montar a produção sem adivinhar nada.
- Como mantenedor, quero que um merge na `main` publique sozinho, para não repetir o deploy à mão.
- Como proprietário, quero o site no ar no domínio da barbearia, para os clientes agendarem sozinhos.

## Regras envolvidas
- RN-51 — lembrete cerca de 24h antes (serviço `jobs`)
- RN-50, RN-52, RN-53 — e-mails de confirmação, remarcação e cancelamento (Resend)
- RN-71 — administração por `ADMIN_EMAILS`

## Decisões
- **Configuração pelo painel, não por arquivo no repositório.** Em novembro de 2026, a Railway marcou o *Config as Code* (`railway.json` / `railway.toml`) como descontinuado: serviços novos não podem mais adotá-lo, e os arquivos existentes deixam de ser lidos em 2026-12-01. O substituto (*Infrastructure as Code*, `.railway/railway.ts`) ainda não documenta caminho do Dockerfile, *watch paths*, cron nem política de reinício, que este projeto usa. Por isso, a configuração fica no painel e está **toda** nesta spec e em [arquitetura.md](../arquitetura.md#serviços-na-railway), como o ADR 0005 já pedia. Vale rever quando o `railway.ts` cobrir esses campos.
- **Migração no *pre-deploy*, não no comando de início.** A `api` roda `alembic upgrade head` como *Pre-deploy Command*. Ele roda uma vez por deploy, num container separado, com acesso à rede privada e às variáveis. Se a migração falhar, o deploy novo não entra e o anterior continua no ar. No `alembic upgrade head && uvicorn ...`, a migração rodaria a cada reinício do container.
- **Porta fixa por variável.** A `api` escuta na 8000, e o `web` na 3000 (os `CMD` dos Dockerfiles). A variável `PORT` de cada serviço é definida com esse valor, para o *healthcheck* e o domínio público da Railway acertarem a porta.
- **Imagens sem mudança.** Os Dockerfiles já terminam no estágio de produção (`runtime` na API, `runner` no web), que é o que a Railway constrói. O `jobs` usa a imagem da API com outro comando.
- **Tabelas do Better Auth por `pnpm auth:migrate` rodado da máquina.** A imagem standalone do web não leva a CLI do Better Auth. A CLI roda uma vez pelo container de desenvolvimento, apontada para o banco da Railway por um acesso público temporário (passo 6).
- **Banco sem dados fictícios.** As migrações já criam a barbearia, o horário de funcionamento, os três barbeiros (com as fotos fictícias, D10) e os serviços "Corte Simples" e "Corte + Barba". O resto entra pela administração, com os dados reais. Os dados fictícios da demonstração ficam só no notebook, e o comando que os cria se recusa a rodar fora de um banco de demonstração.

## Critérios de aceite
**CA-1 — No ar**
- **Dado** os quatro serviços implantados
- **Quando** abro o domínio `*.up.railway.app` no celular
- **Então** a página inicial aparece com a identidade visual, os barbeiros e os serviços.

**CA-2 — Login e administração**
- **Dado** o cliente OAuth de produção configurado
- **Quando** entro com o Google com o e-mail que está em `ADMIN_EMAILS`
- **Então** `/admin` abre a agenda, e uma conta fora da lista volta para `/`.

**CA-3 — E-mail ao cliente**
- **Dado** o Resend com domínio verificado
- **Quando** uma conta Google que **não** é a dona da conta do Resend agenda pelo site
- **Então** ela recebe o e-mail de confirmação, e o link "Meus agendamentos" abre o domínio de produção.

**CA-4 — Lembrete**
- **Dado** o serviço `jobs` com cron de hora em hora
- **Quando** um agendamento feito com mais de 24h de antecedência entra na janela de 23h a 25h
- **Então** o cliente recebe o lembrete, e o log do `jobs` mostra cada execução sem erro.

**CA-5 — Deploy contínuo**
- **Dado** a produção no ar
- **Quando** um PR é mergeado na `main`
- **Então** só os serviços cuja pasta mudou são implantados de novo, sem ação manual.

**CA-6 — Custo sob controle**
- **Dado** a montagem completa no plano Hobby
- **Então** a Railway tem um limite rígido de gasto e um alerta por e-mail configurados, e o meio de pagamento é o da barbearia.

## Passo a passo

> Use os nomes de serviço exatamente como estão aqui (`Postgres`, `api`, `web`, `jobs`): as variáveis de referência (`${{api.RAILWAY_PRIVATE_DOMAIN}}`) usam esses nomes. Nunca cole segredo em chat, issue ou commit.

### 0. Antes de começar
1. Os proprietários aceitaram o sistema, e a barbearia vai pagar a hospedagem (D9).
2. A `main` está com o CI verde (`gh run list --branch main --limit 1`).
3. Você tem um domínio próprio para o remetente dos e-mails, com acesso ao DNS (passo 8). Sem ele, o CA-3 não passa.

### 1. Conta e projeto
1. Entre em [railway.com](https://railway.com) e assine o plano **Hobby** com o meio de pagamento da barbearia. Quem fica como dono da conta é combinado com os proprietários no aceite.
2. Confira de novo os limites e os preços do Hobby em [Plans](https://docs.railway.com/reference/pricing/plans). Em novembro de 2026: US$ 5 por mês com US$ 5 de uso incluso. Veja "Custo" abaixo.
3. Crie um projeto vazio chamado `augusto-barbearia`. Se o painel pedir uma região, escolha a mais próxima do Brasil (leste dos EUA).
4. Na integração com o GitHub, dê ao app da Railway acesso ao repositório privado `vitorazevedop7/AugustoBarbearia`.

### 2. Postgres
1. **New → Database → PostgreSQL.** Mantenha o nome `Postgres`.
2. Não habilite o acesso público agora (o passo 6 faz isso por alguns minutos).

### 3. Serviço `api`
1. **New → GitHub Repo →** `AugustoBarbearia`. Renomeie o serviço para `api`.
2. **Settings:**

   | Campo | Valor |
   |---|---|
   | Root Directory | `/api` |
   | Builder | Dockerfile (a Railway detecta `api/Dockerfile`) |
   | Watch Paths | `/api/**` |
   | Branch | `main`, com deploy automático |
   | Wait for CI | Ligado, se a opção aparecer: o deploy espera o CI do commit passar (ADR 0007) |
   | Custom Start Command | vazio (usa o `CMD` do Dockerfile: `uvicorn app.main:app --host 0.0.0.0 --port 8000`) |
   | Pre-deploy Command | `alembic upgrade head` |
   | Healthcheck Path | `/health` |
   | Restart Policy | On Failure |
   | Networking | **Sem** domínio público |

3. **Variables:** ver a tabela da `api` em "Variáveis por serviço". Os valores que dependem do domínio do `web` podem ficar para depois do passo 4.

### 4. Serviço `web`
> **Ordem do primeiro deploy:** crie o `web` só depois que o deploy da `api` estiver **Active**, com o healthcheck `/health` verde. A Railway não espera um serviço pelo outro. Se o `web` abrir antes, a vitrine aparece sem serviços nem barbeiros. A falha da API não fica no cache, e a página se corrige no recarregamento seguinte, mas não é isso que os proprietários devem ver. Depois que o domínio do `web` existir, preencha as variáveis da `api` que dependem dele e clique em **Deploy** nas mudanças pendentes. A Railway reimplanta a `api` sozinha.

1. **New → GitHub Repo →** `AugustoBarbearia`. Renomeie o serviço para `web`.
2. **Settings:**

   | Campo | Valor |
   |---|---|
   | Root Directory | `/web` |
   | Builder | Dockerfile (`web/Dockerfile`) |
   | Watch Paths | `/web/**` |
   | Branch | `main`, com deploy automático |
   | Wait for CI | Ligado, se a opção aparecer |
   | Custom Start Command | vazio (`node server.js`) |
   | Healthcheck Path | `/` |
   | Restart Policy | On Failure |
   | Networking | **Generate Domain**, porta de destino `3000` |

3. Anote o domínio gerado (`<algo>.up.railway.app`). Ele entra no Google (passo 7) e nas variáveis abaixo.
4. **Variables:** ver a tabela do `web`. Gere o `BETTER_AUTH_SECRET` com `openssl rand -base64 32`.

### 5. Serviço `jobs`
1. **New → GitHub Repo →** `AugustoBarbearia`. Renomeie o serviço para `jobs`.
2. **Settings:**

   | Campo | Valor |
   |---|---|
   | Root Directory | `/api` |
   | Builder | Dockerfile (`api/Dockerfile`) |
   | Watch Paths | `/api/**` |
   | Branch | `main`, com deploy automático |
   | Custom Start Command | `python -m app.jobs.send_reminders` |
   | Cron Schedule | `0 * * * *` (de hora em hora, em UTC) |
   | Pre-deploy Command | vazio (a migração é da `api`) |
   | Healthcheck Path | vazio |
   | Restart Policy | Never |
   | Networking | Sem domínio |

3. **Variables:** ver a tabela do `jobs`.

O comando termina depois de enviar os lembretes, como a Railway exige de um cron. Se uma execução ainda estiver rodando na hora da próxima, a Railway pula a nova. A janela de 23h a 25h e o registro do lembrete cobrem uma hora perdida (S5.08).

### 6. Tabelas do Better Auth
O web não sobe sem as tabelas do Better Auth (`user`, `session`, `account`, `verification`, `jwks`), porque confere o schema ao iniciar.

1. No `Postgres`, **Settings → Networking → Public Access**. A Railway cria um proxy TCP e a variável `DATABASE_PUBLIC_URL`.
2. Copie o valor de `DATABASE_PUBLIC_URL` (aba Variables do `Postgres`) e rode, na raiz do repositório:

   ```bash
   docker compose run --rm --no-deps -e DATABASE_URL='<DATABASE_PUBLIC_URL>' web pnpm auth:migrate
   ```

3. Remova o acesso público do `Postgres` (o tráfego do proxy é cobrado, e o banco não precisa ficar exposto).
4. Faça **Redeploy** do `web`.

Repita este passo quando uma atualização do Better Auth mudar as tabelas.

### 7. Google OAuth
No projeto `augusto-barbearia-130405` do Google Cloud:

1. **APIs e serviços → Credenciais → Criar credenciais → ID do cliente OAuth**, tipo "Aplicativo da Web", nome "Augusto Barbearia — produção". O cliente "— local" não muda.
   - Origem JavaScript autorizada: `https://<domínio do web>`
   - URI de redirecionamento autorizado: `https://<domínio do web>/api/auth/callback/google`
2. Cole o ID e a chave secreta em `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` do `web`.
3. **Tela de consentimento OAuth → Publicar app** ("Em produção"). No modo "Em teste", só os usuários de teste entram, e nenhum cliente da barbearia conseguiria agendar. O login pede só `openid`, `email` e `profile`, que não são escopos sensíveis, e por isso o Google não exige verificação para publicar. Não envie logotipo na tela de consentimento: com logotipo, o Google pede a verificação da marca.
4. Entre no domínio de produção com uma conta que não seja de teste e confirme que não aparece a tela "o Google não verificou este app". Se aparecer, o app precisa passar pela verificação do Google antes de o site ser divulgado aos clientes. Até lá, só os usuários de teste conseguem entrar.

### 8. Resend
1. Crie a conta gratuita no [Resend](https://resend.com).
2. **Domains → Add Domain** com o seu domínio (de preferência um subdomínio, como `agenda.seudominio.com.br`) e crie no DNS os registros que o Resend indicar. Espere o status **Verified**. O domínio `*.up.railway.app` não serve, porque o DNS dele não é nosso.
3. **API Keys → Create**, com permissão **Sending access** e restrita ao domínio verificado.
4. Defina na `api` **e** no `jobs`:
   - `RESEND_API_KEY`: a chave;
   - `EMAIL_FROM`: `Augusto Barbearia <agenda@<domínio verificado>>`.

Com o remetente de testes (`onboarding@resend.dev`), os e-mails só chegam ao dono da conta, e o CA-3 não passa.

### 9. Dados reais
1. Entre com a conta de `ADMIN_EMAILS` e confira em `/admin/cadastros` os barbeiros, os serviços (preço e duração) e o horário de funcionamento, com os valores que os proprietários confirmarem.
2. Cadastre o endereço e os contatos da barbearia (#144).

### 10. Conferência
Percorra os critérios de aceite, CA-1 a CA-6, no domínio de produção. Para conferir o CA-5, faça um PR pequeno, mergeie e veja o deploy novo nos serviços da pasta alterada.

## Variáveis por serviço

`${{...}}` são variáveis de referência da Railway: o painel completa e mantém o valor. Toda mudança de variável fica pendente até você clicar em **Deploy**, que reimplanta os serviços afetados. Os nomes e o papel de cada variável estão em [arquitetura.md](../arquitetura.md#variáveis-de-ambiente).

**`api`**

| Variável | Valor |
|---|---|
| `PORT` | `8000` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `ADMIN_EMAILS` | o seu e-mail Google (depois, os dos proprietários, separados por vírgula) |
| `AUTH_JWKS_URL` | `http://${{web.RAILWAY_PRIVATE_DOMAIN}}:3000/api/auth/jwks` |
| `AUTH_ISSUER` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` |
| `AUTH_AUDIENCE` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` |
| `RESEND_API_KEY` | a chave do passo 8 |
| `EMAIL_FROM` | `Augusto Barbearia <agenda@<domínio verificado>>` |
| `WEB_BASE_URL` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` |

**`web`**

| Variável | Valor |
|---|---|
| `PORT` | `3000` |
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `BETTER_AUTH_SECRET` | gerado com `openssl rand -base64 32` (diferente do local) |
| `BETTER_AUTH_URL` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `AUTH_ISSUER` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `AUTH_AUDIENCE` | `https://${{RAILWAY_PUBLIC_DOMAIN}}` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | do cliente "— produção" (passo 7) |
| `API_INTERNAL_URL` | `http://${{api.RAILWAY_PRIVATE_DOMAIN}}:8000` |

**`jobs`**

| Variável | Valor |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `RESEND_API_KEY` | a mesma da `api` |
| `EMAIL_FROM` | o mesmo da `api` |
| `WEB_BASE_URL` | `https://${{web.RAILWAY_PUBLIC_DOMAIN}}` |

`AUTH_ISSUER` e `AUTH_AUDIENCE` precisam ser **iguais** no `web` e na `api`, ou todo JWT é recusado.

## Problemas comuns
- **O web não chega à API, ou a API não busca o JWKS:** confira a porta nas URLs privadas (`:8000` e `:3000`) e o `http://` (a rede privada não usa `https`). Ambientes da Railway criados antes de 16/10/2025 só resolvem IPv6 na rede privada. Num projeto novo isso não acontece. Se acontecer, troque o start da `api` para `uvicorn app.main:app --host :: --port 8000` e aponte `AUTH_JWKS_URL` para `https://<domínio do web>/api/auth/jwks`.
- **Deploy da `api` parado no *pre-deploy*:** a migração falhou. O log do deploy mostra o erro do Alembic, e a versão anterior continua no ar.
- **Login volta com `redirect_uri_mismatch`:** a URI do passo 7 precisa ser exatamente `https://<domínio>/api/auth/callback/google`, sem barra no final.
- **`/admin` manda para `/` com o seu e-mail:** confira `ADMIN_EMAILS` na `api` e se a mudança de variável foi aplicada (botão **Deploy** das mudanças pendentes).
- **E-mail não chega:** o registro aparece `FAILED` na tabela `notifications`, com o erro. Confira se o domínio está **Verified** no Resend e se `EMAIL_FROM` usa esse domínio.

## Custo
O Hobby custa US$ 5 por mês e inclui US$ 5 de uso. Três serviços contínuos (`web`, `api`, `Postgres`) usam algumas centenas de MB de memória, cerca de US$ 3 a 5 por mês a US$ 10 por GB/mês. O `jobs` só consome enquanto roda. A estimativa total é de US$ 5 a 10 por mês (ADR 0005).

Em **Workspace → Usage**, configure:
- um **alerta por e-mail** perto dos US$ 5 incluídos;
- um **limite rígido** (mínimo de US$ 10). Ao atingir esse limite, a Railway tira todos os serviços do ar. Por isso, ele fica acima do consumo esperado, só como proteção contra um gasto fora do normal.

## Fora do escopo
- Domínio próprio do site e passagem das contas (Railway, Google, Resend) para o nome da barbearia: Fase 2 (`roadmap.md`).
- Backup automatizado do banco além do que a Railway oferece.
- Ambiente de homologação.
- Configuração da Railway em arquivo (`.railway/railway.ts`), enquanto ele não cobre os campos usados aqui.
