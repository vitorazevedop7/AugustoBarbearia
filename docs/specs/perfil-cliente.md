# Spec — Cadastro do cliente e perfil com telefone

- **Issue:** #55 (S3.06)
- **Fase:** 1 (MVP) (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
Quem entra com o Google precisa virar um **Cliente** para agendar (O1), e a barbearia precisa de um telefone para falar com ele (RN-10). A S2.09 só valida a identidade do JWT, sem tabela de clientes. Esta spec cria o cadastro do cliente, o vínculo com a conta Google e o perfil em que o cliente informa o telefone. O motor de disponibilidade (#56) e o agendamento usam o `Customer` criado aqui.

## Quem usa
Cliente. A administração não tem perfil de cliente (RN-71).

## Histórias
- Como **cliente**, quero que meu cadastro seja criado quando entro com o Google, para não preencher formulário de conta.
- Como **cliente**, quero informar meu telefone, para poder agendar e a barbearia conseguir falar comigo.
- Como **cliente já cadastrado pela barbearia**, quero que o login com o meu e-mail use o cadastro que já existe, sem criar outro.

## Regras envolvidas
- RN-10 — Login para agendar (telefone obrigatório para agendar).
- RN-16 — Privacidade entre clientes.
- RN-23 — Vínculo de cadastro.
- RN-62 — Cliente.
- RN-71 — Acesso à administração.

## Critérios de aceite

**CA-1 — Primeiro acesso cria o cliente**
- **Dado** um cliente autenticado (RN-71) sem cadastro com o mesmo vínculo nem com o mesmo e-mail
- **Quando** a API resolve o cliente do token (em `GET /me`, `GET /me/profile` ou `PATCH /me/profile`)
- **Então** cria um `Customer` com o nome e o e-mail do token e o vínculo com a conta (`sub`), sem telefone (RN-62).
- **Quando** a mesma conta acessa de novo
- **Então** encontra o cadastro pelo vínculo e não cria outro, mesmo que dois pedidos cheguem ao mesmo tempo.

**CA-2 — Vínculo com cadastro feito pela administração**
- **Dado** um cliente sem vínculo cadastrado com o e-mail `ana@example.com` (o cadastro pela administração entra na Sprint 4)
- **Quando** alguém entra com a conta Google `Ana@Example.com`
- **Então** a API vincula a conta a esse cadastro (RN-23), sem criar outro e sem trocar o nome nem o telefone que a barbearia cadastrou. A comparação de e-mail ignora espaços nas extremidades e diferenças de caixa.

**CA-3 — E-mail já vinculado a outra conta**
- **Dado** um cliente com o e-mail `ana@example.com` já vinculado a outra conta
- **Quando** uma conta diferente com o mesmo e-mail acessa
- **Então** a API responde `409` com `code` = `CUSTOMER_EMAIL_LINKED` e a tela mostra "Este e-mail já está vinculado a outro cadastro. Fale com a barbearia para resolver.". A API não troca o vínculo sozinha, para um cadastro nunca passar de uma conta para outra sem a barbearia saber.

**CA-4 — Administração não vira cliente**
- **Dado** uma conta da lista `ADMIN_EMAILS` (RN-71)
- **Quando** acessa `GET /me`
- **Então** recebe a identidade com `role` = `admin` e `has_phone` = `false`, sem criar cliente.
- **Quando** acessa `GET /me/profile` ou `PATCH /me/profile`
- **Então** a API responde `403` com `code` = `HTTP_403`, sem criar cliente, e a tela `/perfil` leva para `/admin`.

**CA-5 — Ver o perfil**
- **Dado** um cliente autenticado
- **Quando** acessa `GET /me/profile`
- **Então** recebe só o próprio nome, e-mail e telefone (RN-16). O telefone vem `null` enquanto não foi informado.

**CA-6 — Salvar nome e telefone**
- **Dado** um cliente autenticado
- **Quando** envia `PATCH /me/profile` com nome e telefone válidos
- **Então** a API salva e devolve o perfil atualizado. Campo ausente ou `null` fica como está; o telefone não pode ser apagado (RN-62).
- **Dado** um telefone ou nome inválido
- **Quando** envia o `PATCH`
- **Então** a API responde `422` com `code` = `VALIDATION_ERROR`, nada muda, e a tela mostra a mensagem da API acima dos campos.

**CA-7 — Formato do telefone**
- O telefone aceita a digitação comum: espaços, parênteses, pontos, hífens e o prefixo `+55` são ignorados.
- Depois de tirar esses caracteres, precisa ter **DDD + número**: 2 dígitos de um DDD brasileiro existente e, então, um celular de 9 dígitos começando com `9` ou um fixo de 8 dígitos começando com `2` a `5`.
- É gravado só com os dígitos, sem o `55` (ex.: `(11) 98765-4321` vira `11987654321`).
- **Exemplos válidos:** `(11) 98765-4321`, `+55 21 3456-7890`, `11987654321`. **Inválidos:** `98765-4321` (sem DDD), `(10) 98765-4321` (DDD inexistente), `(11) 88765-4321` (celular sem o 9).

**CA-8 — `GET /me` indica o telefone**
- **Dado** um cliente autenticado
- **Quando** acessa `GET /me`
- **Então** recebe `sub`, `email`, `name`, `role` e `has_phone`, que é `true` só quando o cadastro tem telefone. O agendamento (RN-10) usa esse campo para pedir o telefone antes de confirmar.

**CA-9 — Tela `/perfil`**
- **Dado** um visitante sem sessão
- **Quando** abre `/perfil`
- **Então** o servidor redireciona para `/entrar?voltar=/perfil`.
- **Dado** um cliente logado
- **Quando** abre `/perfil`
- **Então** vê o nome (que veio do Google e pode ser corrigido), o e-mail (só leitura) e o telefone, e salva pelo botão "Salvar". Depois de salvar, a página mostra "Perfil salvo.".

## Fluxo e telas
1. O cliente entra com o Google e abre `/perfil` (depois, o agendamento também leva para cá quando falta o telefone).
2. O servidor confere a sessão. Sem sessão, vai para o login com volta para `/perfil`.
3. O Server Component busca `GET /me/profile`. A API cria ou vincula o cadastro na primeira vez (CA-1, CA-2).
4. O formulário mostra nome, e-mail e telefone. O botão "Salvar" chama a Server Action, que envia `PATCH /me/profile`.
5. Estados:
   - **carregando:** esqueleto do formulário com "Carregando seu perfil.";
   - **sucesso:** `Alert` "Perfil salvo.";
   - **erro da API:** `Alert` `danger` com o `message`, mantendo o que a pessoa digitou;
   - **API fora do ar ou JWT recusado com sessão válida:** aviso de indisponibilidade, sem ciclo de login (mesmo padrão de `/admin`).

Sem JavaScript, o formulário continua funcionando. O campo de telefone usa `type="tel"` e `autoComplete="tel-national"`, e a dica mostra o formato esperado.

## API
- `GET /me` (qualquer identidade autenticada): passa a devolver também `has_phone`. Para a administração é sempre `false`.
- `GET /me/profile` (cliente): devolve `name`, `email` e `phone`.
- `PATCH /me/profile` (cliente): recebe `name` e `phone`, opcionais, e devolve o perfil.
- Módulo `app/modules/customers/`. A tabela `customers` guarda o nome, o telefone e o e-mail (normalizado em minúsculas, único), além do `auth_user_id`, que é o `sub` do JWT (o `id` do usuário do Better Auth), também único. Não há chave estrangeira para a tabela `user`: ela pertence ao Better Auth (ADR 0002) e não existe no banco de testes.
- Restrições no banco: cliente vindo do Google tem e-mail (RN-62), e cliente sem conta tem telefone (RN-62, RN-20).

## Fora do escopo desta spec
- O cadastro de cliente pela administração (Sprint 4). Aqui o cadastro sem vínculo só existe nos testes.
- Pedir o telefone dentro do fluxo de agendamento (RN-10): entra com o agendamento.
- Atualizar o nome ou o e-mail do cadastro quando eles mudam no Google.
- Link para o perfil no cabeçalho e exclusão dos dados (RN-72).

## Dúvidas em aberto
Nenhuma.
