# Spec — Cadastro de barbeiros

- **Issue:** #52 (S3.03)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** implementada

## Contexto
A vitrine mostra a equipe, e o agendamento precisa saber com quem o cliente vai ser atendido. Esta funcionalidade guarda os barbeiros no banco e deixa a administração criar, editar, inativar e reativar cada um pelo celular, sem deploy (O1, operação simples). O sistema já nasce com os três proprietários (RN-63). Enquanto as fotos reais não chegam (P10), eles vão usar fotos fictícias como placeholder (D10), que entram na S3.10 (#63).

## Quem usa
Administração. A vitrine e o agendamento leem os barbeiros ativos nas próximas issues.

## Histórias
- Como **administração**, quero **cadastrar um barbeiro novo** para **ele aparecer na vitrine e receber agendamentos**.
- Como **administração**, quero **corrigir o nome, a foto ou a apresentação de um barbeiro** para **a vitrine mostrar a informação certa**.
- Como **administração**, quero **inativar um barbeiro que saiu** para **ele sumir da vitrine sem perder o histórico**, e reativá-lo se ele voltar.

## Regras envolvidas
- RN-60 — Barbeiro
- RN-63 — Dados iniciais
- RN-70 — Perfis e permissões
- RN-71 — Acesso à administração

## Modelo
- **Barbeiro (`Barber`)**, tabela `barbers`:
  - `name`: obrigatório, até 80 caracteres, aparado nas pontas;
  - `photo_path`: opcional, o caminho de uma foto estática do web, no formato `/images/barbeiros/<arquivo>.jpg` (também `.jpeg`, `.png` ou `.webp`), com nome de arquivo em minúsculas, dígitos e hífens. Não há upload nesta sprint;
  - `bio` (a apresentação): opcional, até 400 caracteres (RN-60). Um texto vazio vira ausência de valor;
  - `active`: ativo ou inativo, `true` ao criar;
  - `created_at` e `updated_at`, em `timestamptz`.
- Não há exclusão: um barbeiro que sai é inativado, para preservar o histórico de agendamentos que virá nas próximas issues.
- O nome não é único. Nenhuma regra impede dois barbeiros com o mesmo nome.
- A migração cria os três proprietários (RN-63): Edvaldo, Lauro e Manoel, ativos, sem foto e sem apresentação.
  - A apresentação começa vazia porque o repositório não tem textos dos proprietários. A administração a preenche pela tela.
  - Até as fotos placeholder entrarem (S3.10, #63), a tela mostra a inicial do nome no lugar da foto.

### Fotos placeholder (D10) — S3.10 (#63)
- São três fotos fictícias de barbeiro, geradas por IA, em proporção 4:5. Elas **não retratam os proprietários**.
- Vão ficar em `web/public/images/barbeiros/`, em JPEG: `edvaldo.jpg`, `lauro.jpg` e `manoel.jpg`.
- Uma migração de dados da S3.10 preenche esses caminhos nos três proprietários que ainda estiverem sem foto.
- Quando as fotos reais chegarem (P10), elas substituem os arquivos com o mesmo nome, ou a administração troca o caminho na tela.

## Critérios de aceite

**CA-1 — Dados iniciais (RN-63)**
- **Dado** um banco recém-migrado
- **Quando** a administração chama `GET /admin/barbers`
- **Então** recebe Edvaldo, Lauro e Manoel, ativos, sem foto e sem apresentação.

**CA-2 — Criar barbeiro (RN-60)**
- **Dado** a administração autenticada
- **Quando** envia `POST /admin/barbers` com nome, foto e apresentação
- **Então** recebe `201` com o barbeiro criado e ativo, e ele aparece na lista.

**CA-3 — Validações de cadastro (RN-60)**
- **Dado** a administração autenticada
- **Quando** cria ou edita um barbeiro com nome vazio, nome acima de 80 caracteres, apresentação acima de 400 caracteres ou foto fora do formato `/images/barbeiros/<arquivo>.<jpg|jpeg|png|webp>`
- **Então** a API responde `422` com `code` = `VALIDATION_ERROR`, e nada é gravado.

**CA-4 — Editar barbeiro**
- **Dado** um barbeiro cadastrado
- **Quando** a administração envia `PATCH /admin/barbers/{id}` com só alguns campos
- **Então** só esses campos mudam. Foto ou apresentação enviadas vazias (ou `null`) são removidas.

**CA-5 — Inativar e reativar (RN-60)**
- **Dado** um barbeiro ativo
- **Quando** a administração envia `PATCH /admin/barbers/{id}` com `active: false`, e depois com `active: true`
- **Então** o barbeiro aparece como inativo, e depois de novo como ativo. O cadastro continua na lista nos dois casos.

**CA-6 — Barbeiro inexistente**
- **Dado** um id que não existe
- **Quando** a administração chama `GET` ou `PATCH /admin/barbers/{id}`
- **Então** a API responde `404` com `code` = `BARBER_NOT_FOUND` e "Barbeiro não encontrado.".

**CA-7 — Só a administração acessa (RN-70, RN-71)**
- **Dado** um cliente autenticado, ou alguém sem token
- **Quando** chama qualquer rota `/admin/barbers`
- **Então** recebe `403` (cliente) ou `401` (sem token), e nada muda.

**CA-8 — Telas no celular**
- **Dado** a administração em `/admin/cadastros/barbeiros`, numa tela de 360px
- **Quando** cria, edita ou inativa um barbeiro
- **Então** volta para a lista com um `Alert` de sucesso e vê a situação atualizada. Se a API recusar, o formulário mostra o `message` dela num `Alert` `danger` e mantém o que foi digitado.

## Fluxo e telas
- **`/admin/cadastros`** ganha o atalho "Barbeiros".
- **`/admin/cadastros/barbeiros`:** lista de todos os barbeiros, os ativos primeiro e depois por nome.
  - Cada item mostra a foto em 4:5 (`next/image`) ou, sem foto, um quadro neutro com a inicial. Também mostra o nome, um `Badge` "Ativo" ou "Inativo" e o link "Editar".
  - O botão "Novo barbeiro" leva ao formulário de criação.
  - Sem barbeiros, um `EmptyState` com o mesmo botão.
  - A lista mostra o `Alert` de sucesso quando volta de um formulário ("Barbeiro cadastrado." ou "Barbeiro atualizado.").
- **`/admin/cadastros/barbeiros/novo`** e **`/admin/cadastros/barbeiros/{id}`:** o mesmo formulário, com:
  - nome;
  - foto (opcional), um campo de texto com o caminho da foto e a dica do formato. O envio de arquivo fica para depois;
  - apresentação (opcional), com até 400 caracteres;
  - só na edição, a situação (Ativo/Inativo), com a dica de que o inativo some da vitrine e não recebe agendamentos novos.

  O formulário funciona sem JS (Server Action e campos nativos). Durante o envio, o botão fica em `pending`. Depois de salvar, volta para a lista. Um id inexistente mostra a página 404.

## API
| Método | Caminho | Quem | O que faz |
|---|---|---|---|
| `GET` | `/admin/barbers` | Administração | Todos os barbeiros, ativos primeiro e depois por nome |
| `POST` | `/admin/barbers` | Administração | Cria um barbeiro ativo; responde `201` |
| `GET` | `/admin/barbers/{id}` | Administração | Um barbeiro, para o formulário de edição |
| `PATCH` | `/admin/barbers/{id}` | Administração | Altera só os campos enviados, incluindo `active` para inativar ou reativar |

O barbeiro trafega como `{ id, name, photo_path, bio, active }`.

## Fora do escopo desta spec
- **A trava da RN-60** que impede inativar um barbeiro com agendamentos ativos no futuro. Ela entrou na S3.07 (#56), junto com o agendamento: ver o CA-12 de [disponibilidade.md](disponibilidade.md).
- Upload de foto: as fotos são arquivos estáticos do web.
- A vitrine e a rota pública com os barbeiros ativos: S3.05 (#54).
- Quais serviços cada barbeiro realiza (`BarberService`): S3.04 (#53).
- Excluir barbeiro.
- As fotos placeholder dos proprietários: S3.10 (#63).

## Dúvidas em aberto
- Fotos reais e textos de apresentação dos proprietários: pendência P10, resolvida na apresentação.
- Fotos placeholder: o Vitor gera as três imagens na S3.10 (#63).
