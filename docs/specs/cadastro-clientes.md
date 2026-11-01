# Spec — Cadastro de clientes pela administração

- **Issue:** #94 (S5.02)
- **Fase:** 1 (MVP) (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
Nem todo cliente da barbearia tem conta Google: muita gente liga ou chega no balcão. A administração precisa cadastrar essa pessoa e, depois, achar rápido quem já está cadastrado, pelo nome ou pelo telefone (O1, operação simples). O cadastro feito aqui também é o que o agendamento manual (#97, RN-20) usa para escolher ou criar o cliente. A tabela `customers` e o vínculo com a conta Google vêm da S3.06 ([perfil-cliente.md](perfil-cliente.md)); esta spec só acrescenta a visão da administração.

## Quem usa
Administração (RN-70). O cliente continua vendo e alterando só o próprio perfil (`/me/profile`, RN-16).

## Histórias
- Como **administração**, quero **cadastrar um cliente só com nome e telefone** para **agendá-lo mesmo que ele não tenha conta Google**.
- Como **administração**, quero **buscar um cliente por parte do nome ou do telefone** para **não cadastrar a mesma pessoa duas vezes**.
- Como **administração**, quero **corrigir o nome, o telefone ou o e-mail de um cliente** para **a agenda ter o contato certo**.
- Como **administração**, quero **ver se o cliente já tem conta Google** para **saber se ele consegue agendar sozinho**.

## Regras envolvidas
- RN-20 — Cliente sem conta (nome e telefone obrigatórios, e-mail opcional).
- RN-23 — Vínculo de cadastro.
- RN-62 — Cliente.
- RN-70 — Perfis e permissões (clientes são da administração).
- RN-71 — Acesso à administração.
- RN-72 — LGPD (a exclusão e a anonimização ficam fora, veja abaixo).

## Modelo
Usa a tabela `customers` como está (sem migração):

- `name`: obrigatório, até 120 caracteres, aparado nas pontas.
- `phone`: obrigatório no cadastro pela administração (RN-20, RN-62), no formato do perfil: só dígitos, DDD + celular ou fixo (CA-7 de [perfil-cliente.md](perfil-cliente.md)). **Não é único**: duas pessoas da mesma casa podem dividir um telefone.
- `email`: opcional, em minúsculas e sem espaços nas pontas (a mesma normalização do vínculo, RN-23), único. Um texto vazio vira ausência de e-mail.
- `auth_user_id`: o vínculo com a conta Google. A administração nunca o define nem o lê; a API só informa se existe (`has_account`).

A busca não tem índice novo: a barbearia tem centenas de clientes, e um `ILIKE` sobre a tabela inteira é instantâneo nessa escala. Se o volume crescer, o caminho é um índice `pg_trgm` (migração própria, em outra issue).

## Critérios de aceite

**CA-1 — Cadastrar com nome e telefone (RN-20, RN-62)**
- **Dado** a administração autenticada
- **Quando** envia `POST /admin/customers` com `name` e `phone` (e-mail ausente ou vazio)
- **Então** recebe `201` com o cliente, com `email` = `null`, `has_account` = `false` e o telefone só com dígitos.

**CA-2 — Cadastrar com e-mail (RN-20, RN-23)**
- **Dado** a administração autenticada
- **Quando** envia `POST /admin/customers` com e-mail (ex.: `" Ana@Example.com "`)
- **Então** o cliente é gravado com o e-mail normalizado (`ana@example.com`).

**CA-3 — Dados obrigatórios e formato (RN-20, RN-62)**
- **Dado** a administração autenticada
- **Quando** cria um cliente sem nome, sem telefone, com nome em branco, com telefone sem DDD ou com e-mail em formato inválido
- **Então** a API responde `422` com `code` = `VALIDATION_ERROR`, e nada é gravado.

**CA-4 — E-mail repetido**
- **Dado** um cliente com o e-mail `ana@example.com`
- **Quando** a administração cria outro cliente, ou edita outro, com esse e-mail (em qualquer caixa)
- **Então** a API responde `409` com `code` = `CUSTOMER_EMAIL_TAKEN` e a mensagem "Já existe um cliente cadastrado com este e-mail.", e nada é gravado. A tela mostra a mensagem e mantém o que foi digitado.

**CA-5 — Buscar por nome, telefone ou e-mail**
- **Dado** clientes cadastrados
- **Quando** a administração chama `GET /admin/customers?q=<texto>`
- **Então** a API devolve os clientes cujo nome ou e-mail contém o texto (sem diferenciar maiúsculas) ou, quando o texto só tem dígitos e separadores de telefone (`(75) 99999`, `+55 75 9999`), cujo telefone contém esses dígitos. Sem `q`, ou com `q` em branco, devolve todos. A ordem é por nome e depois por id.
- Os curingas do `LIKE` (`%` e `_`) valem como texto comum: `q=%` não devolve todos.
- A busca não ignora acentos: `jose` não encontra `José`. (O `unaccent` do PostgreSQL pede uma extensão; fica para quando a barbearia pedir.)

**CA-6 — Paginação**
- **Dado** mais clientes do que cabem numa página
- **Quando** a administração chama `GET /admin/customers?page=2&page_size=20`
- **Então** recebe `items` da página, o `total` de clientes que casam com a busca, `page` e `page_size`. `page` começa em 1 (padrão 1) e `page_size` vai de 1 a 50 (padrão 20); fora disso a API responde `422`. Uma página além do fim devolve `items` vazio.

**CA-7 — Ler um cliente**
- **Dado** um cliente cadastrado
- **Quando** a administração chama `GET /admin/customers/{id}`
- **Então** recebe `id`, `name`, `phone`, `email` e `has_account`. Um id inexistente responde `404` com `code` = `CUSTOMER_NOT_FOUND`.

**CA-8 — Editar (RN-62)**
- **Dado** um cliente cadastrado
- **Quando** a administração envia `PATCH /admin/customers/{id}` com alguns campos
- **Então** só `name`, `phone` e `email` enviados mudam. `name` e `phone` ausentes ou `null` ficam como estão (RN-62: são obrigatórios). Em um cliente **sem conta**, `email` enviado vazio ou `null` apaga o e-mail.
- **Dado** um cliente que veio do Google e ainda não informou telefone
- **Quando** a administração envia o telefone
- **Então** ele é gravado (o cliente passa a poder agendar, RN-10).

**CA-9 — E-mail de quem tem conta Google fica travado**
- **Dado** um cliente com conta Google (`has_account` = `true`)
- **Quando** a administração tenta trocar ou apagar o e-mail
- **Então** a API responde `409` com `code` = `CUSTOMER_EMAIL_LOCKED` e a mensagem "O e-mail deste cliente vem da conta Google e não pode ser alterado.", e nada é gravado. Reenviar o mesmo e-mail (a tela de edição não o envia) não é erro.
- **Por quê:** o e-mail é a identidade que o Google confirmou. Trocá-lo na mão faria o cadastro divergir da conta, e abriria caminho para tomar o e-mail de outra pessoa (que então receberia `CUSTOMER_EMAIL_LINKED` ao entrar). Nome e telefone, que o cliente também edita no perfil, a administração pode corrigir.

**CA-10 — Vínculo de ponta a ponta (RN-23)**
- **Dado** um cliente cadastrado pela administração com o e-mail `ana@example.com`, nome "Ana Souza" e telefone `75999990000`
- **Quando** alguém entra com a conta Google `Ana@Example.com` e abre o perfil
- **Então** a API vincula a conta a esse cadastro, sem criar outro e sem trocar nome nem telefone. Em seguida, `GET /admin/customers/{id}` mostra `has_account` = `true`, e o e-mail passa a ficar travado (CA-9).

**CA-11 — Só a administração (RN-70)**
- **Dado** um cliente autenticado, ou um visitante sem token
- **Quando** chama qualquer rota `/admin/customers`
- **Então** a API responde `403` (cliente) ou `401` (visitante).

**CA-12 — Tela de lista**
- **Dado** a administração em `/admin/clientes`
- **Quando** a página carrega
- **Então** vê o campo de busca, o botão "Novo cliente" e, em cartões (o celular de 360px é a tela principal), nome, telefone formatado, e-mail e a marca "Com conta Google" ou "Sem conta". Cada cartão tem o link "Editar".
- **Quando** busca por um texto
- **Então** a página recarrega com `?q=` e mostra só os clientes que casam; sem resultado, mostra "Nenhum cliente encontrado" com o botão de cadastro; sem nenhum cliente cadastrado, "Nenhum cliente cadastrado".
- **Quando** há mais de uma página
- **Então** aparecem "Anterior" e "Próxima", que mantêm a busca, e o texto "Página 2 de 5".

**CA-13 — Telas de cadastro e edição**
- **Dado** a administração em `/admin/clientes/novo`
- **Quando** preenche nome e telefone e envia
- **Então** a Server Action chama `POST /admin/customers` e volta para a lista com "Cliente cadastrado.".
- **Dado** a administração em `/admin/clientes/{id}`
- **Então** o formulário vem preenchido; se o cliente tem conta Google, o e-mail aparece como somente leitura, com a dica do motivo. "Salvar cliente" chama `PATCH` e volta para a lista com "Cliente atualizado.".
- **Em erro da API**, o `message` aparece acima dos campos e o formulário mantém o que foi digitado. Um id inexistente ou inválido mostra a página 404.

## Fluxo e telas

```
/admin/clientes ──[Novo cliente]──▶ /admin/clientes/novo ──[Salvar]──▶ /admin/clientes?aviso=cadastrado
       │
       └──[Editar]──▶ /admin/clientes/{id} ──[Salvar]──▶ /admin/clientes?aviso=atualizado
```

- O item "Clientes" entra na navegação de `/admin` e um cartão na página inicial da administração.
- A busca é um `<form method="get">`, então funciona sem JavaScript e a URL (`?q=&pagina=`) pode ser compartilhada e recarregada. A busca volta sempre para a página 1.
- Estados da lista: carregando (`loading.tsx` da administração), vazio (cadastro ou busca sem resultado), erro (`Alert` `danger` com o `message` da API ou "Não foi possível carregar os clientes. Tente novamente em instantes.").
- O formulário usa `type="tel"`, `autoComplete="off"` (é o cliente de outra pessoa, não o próprio dado do navegador) e a dica "Com DDD. Exemplo: (11) 98765-4321.". O e-mail vem marcado como opcional.
- Os campos nome/telefone/e-mail ficam no componente `CustomerFields` (`web/src/components/admin/customer-fields.tsx`), para outras telas da administração, como o agendamento manual (#97), usarem o mesmo bloco dentro do formulário delas. O envio (`parseCustomerForm`, `form-data.ts`) e a Server Action são da tela de clientes.

## API
Módulo `app/modules/customers/`, router `admin_router` (todas exigem `require_admin`, RN-70):

| Rota | O que faz |
|---|---|
| `GET /admin/customers?q=&page=&page_size=` | Busca paginada (CA-5, CA-6). Devolve `{ items, total, page, page_size }` |
| `POST /admin/customers` | Cria o cliente sem conta (CA-1 a CA-4). `201` |
| `GET /admin/customers/{id}` | Lê um cliente (CA-7). `404 CUSTOMER_NOT_FOUND` |
| `PATCH /admin/customers/{id}` | Altera nome, telefone e e-mail (CA-8, CA-9) |

Resposta de cliente: `id`, `name`, `phone` (`null` para quem veio do Google e ainda não informou), `email` (`null` se não tem) e `has_account`.

Erros: `422 VALIDATION_ERROR`, `404 CUSTOMER_NOT_FOUND`, `409 CUSTOMER_EMAIL_TAKEN`, `409 CUSTOMER_EMAIL_LOCKED`.

No `service.py`: `create_customer(session, data)` é a função de criação, que outros módulos (o agendamento manual, #97) chamam em vez de montar o `Customer` por conta própria. Ela valida a unicidade do e-mail e traduz a corrida de dois cadastros iguais ao mesmo tempo (violação de `uq_customers_email`) para o mesmo `409`. `search_customers` e `get_customer` são as leituras.

## Exclusão e anonimização (RN-72) — fora desta issue
Não há `DELETE` nem tela de exclusão. O cliente que pede a exclusão dos dados fala com a barbearia, como diz a política de privacidade, mas o sistema ainda não tem como atender o pedido: o cadastro não pode simplesmente ser apagado, porque os agendamentos concluídos continuam no histórico financeiro (RN-72) e apontam para o cliente, e a anonimização (trocar os dados pessoais mantendo o histórico) é uma issue própria. Até lá, um cadastro errado se corrige pelo `PATCH`.

## Fora do escopo desta spec
- Exclusão, anonimização e exportação de dados do cliente (RN-72).
- Unir dois cadastros do mesmo cliente (um do balcão e outro do Google com e-mails diferentes). Hoje a administração corrige o e-mail do cadastro do balcão para o do Google antes do primeiro login.
- Histórico de agendamentos do cliente na tela de edição.
- Busca sem acentos e índice `pg_trgm`.
- Agendar pela administração, que reutiliza este cadastro (#97).

## Dúvidas em aberto
Nenhuma.
