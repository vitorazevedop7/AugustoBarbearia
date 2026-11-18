# 0011 — Entrada de demonstração sem Google, só com flag

- **Status:** aceito
- **Data:** 2026-11-18

## Contexto
O projeto vai virar portfólio público (#199). Quem avalia o trabalho (recrutadores) e o vídeo de demonstração precisam ver a administração e a área do cliente, mas o login é só com Google ([0003](0003-autenticacao.md)) e o app OAuth está "em teste": só entram as contas cadastradas como usuárias de teste no Google Cloud. Pedir a conta Google de cada visitante não funciona, e a conta de administração é a de `ADMIN_EMAILS`, que não pode ser emprestada.

O [0003](0003-autenticacao.md) diz que o Better Auth é "o único responsável pelo login" com o provider Google. Esta decisão **complementa** o 0003, sem substituí-lo: o Google continua sendo a única entrada da produção.

## Decisão
**Com `DEMO_LOGIN_ENABLED=true`, a página `/entrar` oferece duas entradas sem Google, em duas contas fictícias fixas, criadas e autenticadas só pelo servidor do web, pelo próprio Better Auth.** Fica desligada por padrão.

- As contas são `admin@demo.augustobarbearia.local` e `cliente@demo.augustobarbearia.local` (`web/src/lib/demo-mode.ts`). O domínio `.local` não recebe e-mail.
- A entrada é um endpoint de um plugin do Better Auth marcado como **só do servidor** (`SERVER_ONLY`): ele não existe em `/api/auth/*`, e só a Server Action `signInAsDemo` o chama. Ele encontra ou cria o usuário pelo e-mail fixo e grava uma sessão comum do Better Auth. Não há senha, e o plugin de e-mail e senha continua desligado: ninguém cria conta nem escolhe em qual conta entrar além dessas duas.
- A sessão é a mesma do Google: o mesmo cookie, o mesmo JWT para a API. **A API não muda.** O papel continua vindo de `ADMIN_EMAILS` (RN-71), então a conta fictícia de administração só é administração onde alguém a pôs nessa lista.
- **Trava dupla na produção:** numa imagem de produção (`NODE_ENV=production`), a flag só vale com `DEMO_LOGIN_ACKNOWLEDGE=public-demo`, que só o `docker-compose.demo.yml` define. Sem ela, o web ignora a flag e registra o erro no log. Com a flag desligada, a Server Action responde 404 e o endpoint recusa com 404.
- Com a flag ligada, todas as páginas mostram a faixa "Ambiente de demonstração — dados fictícios".

## Alternativas consideradas
- **Plugin de e-mail e senha do Better Auth com `disableSignUp`:** abriria `/api/auth/sign-in/email` ao público, protegido só por uma senha guardada no servidor, e exigiria criar as contas por fora. A entrada pelo endpoint só do servidor não tem senha para vazar nem rota pública.
- **Cadastrar os visitantes como usuários de teste no Google:** não escala, e expõe a conta de quem testa.
- **Conta "admin" própria do portfólio no Google:** o visitante ainda precisaria da senha dela.
- **Papel no token para a conta fictícia:** contraria o 0003 (o papel é decidido na API) e mudaria a API.

## Consequências
- A demonstração pública e o vídeo entram como administração e como cliente com um toque, sem nenhuma conta Google.
- Qualquer visitante da demonstração entra como administração e pode alterar os dados fictícios. É o propósito, e o `scripts/demo.sh reset` os recria.
- Há uma segunda forma de criar sessão no web. Ela depende de duas variáveis na produção e é coberta por testes da lógica da trava.
- `ADMIN_EMAILS` da demonstração inclui a conta fictícia; o `docker-compose.demo.yml` a põe em primeiro, então o `closed_by` dos dados fictícios é ela, e não o e-mail de alguém real.
