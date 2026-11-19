# Spec — Demonstração no notebook com link público

- **Issue:** #184
- **Fase:** Demonstração no notebook (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
Na apresentação, os proprietários precisam usar o sistema real no próprio celular, sem nada ser pago antes do aceite (D9). O [ADR 0010](../decisoes/0010-demonstracao-local-com-tunel.md) põe a demonstração no notebook do Vitor, com as imagens de produção, aberta por um link `https://` de um túnel gratuito (Cloudflare Tunnel). Esta spec descreve o que sobe, os dados fictícios e o roteiro do ensaio e do dia.

## Quem usa
O Vitor, que sobe a demonstração. Os proprietários, que abrem o link no celular.

## Histórias
- Como Vitor, quero subir a demonstração com um comando, para não depender de lembrar a ordem dos serviços na hora da reunião.
- Como proprietário, quero abrir o site no meu celular, agendar e entrar com o Google, para sentir como o cliente vai usar.
- Como proprietário, quero ver a agenda e o relatório preenchidos, para entender a administração sem imaginar como ela fica cheia.

## Regras envolvidas
Nenhuma regra nova. Os dados fictícios respeitam as regras que o banco e a API já garantem:
- RN-02 e RN-04 — dentro do expediente e na grade de 30 minutos
- RN-03 — nenhum agendamento marcado cruza um bloqueio
- RN-08 — agendamentos marcados do mesmo barbeiro não se cruzam
- RN-13 — preço e duração congelados do serviço
- RN-33 e RN-40 — concluídos e faltas registram quando e quem; só o concluído tem pagamento

## Decisões
- **Projeto do compose separado** (`docker-compose.demo.yml`, projeto `augusto-demo`): banco próprio (`augusto_demo`), sem misturar com o banco de desenvolvimento. O web fica em `http://localhost:3001`, para a demonstração e o `docker compose up` de desenvolvimento rodarem juntos.
- **Imagens de produção**: `api` no estágio `runtime` e `web` no `runner`, os mesmos que vão para a Railway. O estágio de desenvolvimento só aparece no `auth-migrate`, porque a imagem de produção do web não tem a CLI do Better Auth.
- **Ordem de subida**: `db` → `setup` (Alembic e dados fictícios) → `api` saudável → `web`. Com o web antes da API, a vitrine abriria sem serviços.
- **Dados fictícios por comando** (`python -m app.jobs.seed_demo`): o comando só roda num banco cujo nome termina em `_demo`, e não faz nada se o banco já tem agendamentos. A agenda é montada em volta do dia em que o banco foi criado, então o banco é recriado no dia da reunião (`reset`).
- **Clientes fictícios sem e-mail**: nenhum e-mail de confirmação ou lembrete sai para eles. O serviço `jobs` (lembretes) não faz parte da demonstração. A exceção é o cliente da entrada de demonstração (abaixo), com e-mail `.local`, que não recebe mensagem.
- **Entrada sem Google** ([modo-demonstracao.md](modo-demonstracao.md), ADR 0011, #199): o compose liga `DEMO_LOGIN_ENABLED` e `DEMO_LOGIN_ACKNOWLEDGE=public-demo` no web, e `/entrar` oferece "Entrar como administração (demo)" e "Entrar como cliente (demo)". Assim, quem não está entre os usuários de teste do Google, ou o túnel recém-trocado sem os endereços no Google, ainda entra. Para desligar, `DEMO_LOGIN_ENABLED=false` no `.env.demo`.
- **Cliente da demonstração preenchido**: o `seed_demo` cria `cliente@demo.augustobarbearia.local` com telefone, um horário marcado a pelo menos um dia (só um, para ele ainda poder agendar ao vivo, RN-11), dois concluídos e um cancelado. O primeiro login o vincula ao cadastro pelo e-mail (RN-23).
- **Concluídos "por" quem administra**: o `closed_by` dos dados fictícios é o primeiro e-mail de `ADMIN_EMAILS`. O compose põe a conta fictícia `admin@demo.augustobarbearia.local` em primeiro, antes dos e-mails do `.env.demo`, então nenhum e-mail real aparece nos dados fictícios.
- **Túnel rápido do Cloudflare**, sem conta: o endereço `https://<nome>.trycloudflare.com` muda toda vez que o serviço `tunnel` reinicia. O script sobe o túnel antes, lê o endereço do log e o grava em `DEMO_URL`, que vira `BETTER_AUTH_URL`, `AUTH_ISSUER`, `AUTH_AUDIENCE` e `WEB_BASE_URL`. O `reset` apaga o banco sem tocar no túnel, para limpar os dados sem trocar o link nem os endereços cadastrados no Google (#188).
- **Login pelo cliente OAuth local**: o endereço do túnel é cadastrado nele a cada subida, e as contas dos proprietários entram como usuários de teste (o app OAuth está "em teste").

## Critérios de aceite
**CA-1 — Um comando**
- **Dado** o Docker aberto e o `.env` de desenvolvimento preenchido
- **Quando** rodo `scripts/demo.sh up`
- **Então** o script cria o `.env.demo` (na primeira vez), sobe tudo na ordem e mostra o link público e os dois endereços para cadastrar no Google.

**CA-2 — Pelo celular**
- **Dado** a demonstração no ar
- **Quando** abro o link num celular fora do Wi-Fi do notebook
- **Então** a vitrine aparece com a identidade visual, os barbeiros e os serviços, e as etapas de `/agendar` mostram dias e horários livres.

**CA-3 — Login**
- **Dado** o endereço do túnel cadastrado no cliente OAuth e a conta Google como usuária de teste
- **Quando** entro com o Google
- **Então** volto logado ao site, e a conta de `ADMIN_EMAILS` abre `/admin`.

**CA-3b — Entrada sem Google (#199)**
- **Dado** a demonstração no ar
- **Quando** toco em "Entrar como administração (demo)" ou "Entrar como cliente (demo)" em `/entrar`
- **Então** abro `/admin` ou `/meus-agendamentos` (com o próximo horário e o histórico), e todas as páginas mostram a faixa "Ambiente de demonstração — dados fictícios".

**CA-4 — Administração preenchida**
- **Dado** o banco recém-criado
- **Então** a agenda da semana tem concluídos, faltas, cancelados, marcados, uma folga e um bloqueio, o relatório de "Este mês" tem faturamento por barbeiro e por forma de pagamento, e o painel compara com o mês anterior e mostra os horários de pico dos últimos 90 dias (o seed gera quatro meses de histórico, mais cheio na sexta, no sábado e no fim de tarde).

**CA-5 — Trava do banco**
- **Dado** um banco cujo nome não termina em `_demo`
- **Quando** o comando de dados fictícios roda
- **Então** ele termina com erro e não grava nada (`tests/test_seed_demo.py`).

## Comandos

```bash
scripts/demo.sh up      # sobe tudo, mostra o link e mantém o Mac acordado
scripts/demo.sh url     # mostra o link atual e avisa se ele não responde mais
scripts/demo.sh logs    # acompanha os logs
scripts/demo.sh down    # para tudo e guarda o banco da demonstração
scripts/demo.sh reset   # apaga o banco e mantém o túnel; a próxima subida recria os dados com as datas de hoje
```

Na primeira vez, o script cria o `.env.demo` a partir do `.env.demo.example`, copia do `.env` as credenciais do Google, `ADMIN_EMAILS` e o Resend, e gera um `BETTER_AUTH_SECRET` novo. O `.env.demo` não vai para o git. Um `.env.demo` criado antes da #199 não tem `DEMO_LOGIN_ENABLED`; o compose assume `true`.

## Roteiro do ensaio (dias antes da reunião)
1. **Google Cloud**, projeto `augusto-barbearia-130405` → **Tela de consentimento OAuth → Usuários de teste**: inclua as contas Google dos proprietários.
2. `scripts/demo.sh up` e cadastre os dois endereços que ele mostrar no cliente OAuth "Augusto Barbearia — local" (**Credenciais**). Anote quanto tempo o Google leva para aceitar o login: ele avisa que a mudança pode levar de 5 minutos a algumas horas.
3. Num celular **no 4G**, percorra: vitrine, `/agendar` até a confirmação, `/meus-agendamentos` (remarcar e cancelar), `/perfil` e, com a conta da administração, agenda (dia e semana), detalhe, concluir atendimento, bloqueio, clientes, cadastros e relatório. Isso cobre a #91. Anote o que estiver quebrado em issues `fix:`.
4. Opcional: crie a conta gratuita no Resend, gere uma chave e preencha `RESEND_API_KEY` e `EMAIL_FROM` (`Augusto Barbearia <onboarding@resend.dev>`) no `.env.demo`. Com o remetente de testes, a confirmação do agendamento chega **só** à caixa do dono da conta do Resend, o que basta para mostrar o e-mail.
5. `scripts/demo.sh down`.

## Roteiro do dia
1. **Cerca de 1h antes:**
   - `scripts/demo.sh reset`, para os dados fictícios ganharem as datas de hoje. O túnel continua de pé.
   - `scripts/demo.sh up`, num terminal que fica aberto (ele mantém o Mac acordado).
   - Se o script avisar que o link mudou (o túnel do ensaio morreu com o Mac dormindo, por exemplo), cadastre os dois endereços novos no cliente OAuth local. Pode apagar os de subidas anteriores. Sem o aviso, os endereços cadastrados continuam valendo.
   - Teste o login no seu celular, no 4G, e abra `/admin`. Se o Google ainda não aceitar o endereço novo, use "Entrar como administração (demo)".
2. **Durante:** notebook na tomada, tampa aberta e o roteador do celular como reserva da internet. Não rode `down` nem reinicie o Docker: o link mudaria. Com o Mac dormindo (tampa fechada, por exemplo) ou sem internet, o Cloudflare apaga o túnel, e o endereço não volta mais, mesmo com o container de pé.
3. **Se o túnel cair** (o celular diz que o servidor não foi encontrado): rode `scripts/demo.sh up` de novo. O script percebe o túnel morto, cria outro e avisa que o link mudou. Troque os dois endereços no Google e espere alguns minutos. Enquanto isso, mostre pelo próprio notebook em `http://localhost:3001`. A vitrine e o agendamento funcionam, mas o login com Google não, porque o site espera o endereço do túnel.
4. **Depois:** `scripts/demo.sh down`. Os dados fictícios ficam só no notebook. A produção segue a [spec da Railway](deploy-railway.md), com o banco limpo.

## Problemas comuns
- **"O servidor não foi encontrado" no celular:** o túnel morreu. Rode `scripts/demo.sh up` e troque os endereços no Google.
- **"redirect_uri_mismatch" no login:** o endereço do túnel não está no cliente OAuth, ou o Google ainda não aplicou a mudança. Confira se a URI termina em `/api/auth/callback/google`, sem barra no final.
- **"Acesso bloqueado" ou "app não verificado" com a conta de um proprietário:** a conta não está nos usuários de teste.
- **A vitrine abre sem serviços:** a API não estava pronta. Recarregue a página. A falha não fica no cache.
- **`service "auth-migrate" didn't complete successfully`:** veja `scripts/demo.sh logs`. O serviço monta `web/` por volume e precisa da pasta completa.
- **A porta 3001 está em uso:** outro programa ocupa a porta. Feche-o ou mude a porta em `docker-compose.demo.yml` e no `scripts/demo.sh`.

## Fora do escopo
- Link fixo (túnel com nome, que exige um domínio no Cloudflare).
- Lembrete de 24h (serviço `jobs`) e e-mail para qualquer destinatário (exige domínio verificado no Resend), que entram na produção.
- Demonstração que continue no ar depois da reunião, sem o notebook. Se os proprietários pedirem, a reserva é o plano Free da Railway (ADR 0010).
