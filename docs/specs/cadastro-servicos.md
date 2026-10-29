# Spec — Cadastro de serviços

- **Issue:** #53 (S3.04)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** implementada

## Contexto
O cliente agenda um serviço com um barbeiro, e o motor de disponibilidade precisa saber a duração do serviço e quem o realiza (RN-05). Esta funcionalidade guarda os serviços no banco e deixa a administração criar, editar, inativar e reativar cada um pelo celular, sem deploy (O1, operação simples). O sistema já nasce com os dois serviços do projeto acadêmico (RN-63). Os preços reais são a pendência P9.

## Quem usa
Administração. A vitrine e o agendamento leem os serviços ativos nas próximas issues.

## Histórias
- Como **administração**, quero **cadastrar um serviço novo, com preço, duração e os barbeiros que o fazem** para **ele aparecer na vitrine e receber agendamentos**.
- Como **administração**, quero **corrigir o preço, a duração ou os barbeiros de um serviço** para **a vitrine e a agenda refletirem a barbearia de hoje**.
- Como **administração**, quero **inativar um serviço que deixou de ser oferecido** para **ele sumir da vitrine sem perder o histórico**, e reativá-lo se ele voltar.

## Regras envolvidas
- RN-61 — Serviço
- RN-63 — Dados iniciais
- RN-70 — Perfis e permissões
- RN-71 — Acesso à administração
- RN-13 — Preço e duração congelados (só como limite: editar o serviço não mexe em agendamentos, que ainda não existem)

## Modelo
- **Serviço (`Service`)**, tabela `services`, no módulo `app/modules/catalog/`:
  - `name`: obrigatório, até 80 caracteres, aparado nas pontas;
  - `description`: opcional, até 400 caracteres. Um texto vazio vira ausência de valor;
  - `price`: obrigatório, `numeric(10,2)` no banco e `Decimal` no código, maior ou igual a zero (RN-61). Aceita no máximo duas casas decimais;
  - `duration_minutes`: obrigatório, inteiro, múltiplo de 5 e no mínimo 10 (RN-61), com teto técnico de 1440 (um dia);
  - `active`: ativo ou inativo, `true` ao criar;
  - `created_at` e `updated_at`, em `timestamptz`.
- **Barbeiro–Serviço (`BarberService`)**, tabela `barber_services`: a associação N:N, com chave primária composta (`barber_id`, `service_id`). Ela mora no módulo `catalog`, que depende de `barbers`, e não o contrário.
- O serviço tem **pelo menos um barbeiro** (RN-61). Um barbeiro inativo pode continuar ligado ao serviço: ele só deixa de ser oferecido enquanto estiver inativo (RN-05, item 5).
- As regras de preço e de duração também são `CHECK` no banco, como última barreira.
- Não há exclusão: um serviço que sai é inativado (RN-61), para preservar o histórico de agendamentos que virá nas próximas issues.
- O nome não é único. Nenhuma regra impede dois serviços com o mesmo nome.
- A migração `0005` cria as duas tabelas e os serviços iniciais (RN-63), ativos, sem descrição e realizados por Edvaldo, Lauro e Manoel:
  - **Corte Simples**, 30 min, R$ 25,00;
  - **Corte + Barba**, 45 min, R$ 35,00.

### Como o preço trafega
- **Na resposta**, o preço é uma **string decimal** com ponto e sempre duas casas: `"25.00"`. O Pydantic v2 serializa `Decimal` como string no JSON, e o schema fixa as duas casas. O tipo gerado no web é `string`.
- **Na entrada**, o preço vem como string (`"25.00"` ou `"25,00"`, como a pessoa digita) ou como número. A API apara os espaços e, quando há vírgula, trata a vírgula como separador decimal e o ponto como separador de milhar (`"1.234,50"` → `1234.50`). Mais de duas casas decimais é recusado.
- **No web**, o preço nunca vira `number`. A lista formata a string da API com `Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })`, que aceita a string decimal sem passar por `float` (→ "R$ 25,00"). O formulário mostra o preço salvo com vírgula (`"25.00"` → `"25,00"`), por troca de texto, e envia o que foi digitado.

## Critérios de aceite

**CA-1 — Dados iniciais (RN-63)**
- **Dado** um banco recém-migrado
- **Quando** a administração chama `GET /admin/services`
- **Então** recebe Corte Simples (30 min, `"25.00"`) e Corte + Barba (45 min, `"35.00"`), ativos, sem descrição e realizados por Edvaldo, Lauro e Manoel.

**CA-2 — Criar serviço (RN-61)**
- **Dado** a administração autenticada
- **Quando** envia `POST /admin/services` com nome, descrição, preço, duração e barbeiros
- **Então** recebe `201` com o serviço criado, ativo e com os barbeiros escolhidos, e ele aparece na lista.

**CA-3 — Regras do serviço (RN-61)**
- **Dado** a administração autenticada
- **Quando** cria ou edita um serviço com
  - duração que não é múltiplo de 5 ou é menor que 10 minutos;
  - preço negativo;
  - nenhum barbeiro;
- **Então** a API responde `422`, nada é gravado, e o corpo é, respectivamente:
  - `INVALID_SERVICE_DURATION`, "A duração precisa ser de no mínimo 10 minutos, em múltiplos de 5.";
  - `INVALID_SERVICE_PRICE`, "O preço não pode ser negativo.";
  - `SERVICE_WITHOUT_BARBER`, "Escolha pelo menos um barbeiro para o serviço.".

**CA-4 — Barbeiro inexistente na escolha**
- **Dado** um id de barbeiro que não existe
- **Quando** a administração o envia em `barber_ids`
- **Então** a API responde `422` com `code` = `UNKNOWN_BARBER` e "Um dos barbeiros escolhidos não existe mais. Recarregue a página e tente de novo.".

**CA-5 — Formato dos campos**
- **Dado** a administração autenticada
- **Quando** cria ou edita um serviço com nome vazio ou acima de 80 caracteres, descrição acima de 400, preço com mais de duas casas decimais ou que não é número, ou duração acima de 1440 minutos
- **Então** a API responde `422` com `code` = `VALIDATION_ERROR`, e nada é gravado.

**CA-6 — Editar serviço**
- **Dado** um serviço cadastrado
- **Quando** a administração envia `PATCH /admin/services/{id}` com só alguns campos
- **Então** só esses campos mudam. `barber_ids`, quando enviado, substitui a lista inteira. A descrição enviada vazia (ou `null`) é removida. `null` em nome, preço, duração, barbeiros ou situação é recusado com `422`.

**CA-7 — Inativar e reativar, sem excluir (RN-61)**
- **Dado** um serviço ativo
- **Quando** a administração envia `PATCH /admin/services/{id}` com `active: false`, e depois com `active: true`
- **Então** o serviço aparece como inativo, e depois de novo como ativo. Ele continua na lista nos dois casos. Não existe rota de exclusão (`DELETE` responde `405`).

**CA-8 — Serviço inexistente**
- **Dado** um id que não existe
- **Quando** a administração chama `GET` ou `PATCH /admin/services/{id}`
- **Então** a API responde `404` com `code` = `SERVICE_NOT_FOUND` e "Serviço não encontrado.".

**CA-9 — Só a administração acessa (RN-70, RN-71)**
- **Dado** um cliente autenticado, ou alguém sem token
- **Quando** chama qualquer rota `/admin/services`
- **Então** recebe `403` (cliente) ou `401` (sem token), e nada muda.

**CA-10 — Telas no celular**
- **Dado** a administração em `/admin/cadastros/servicos`, numa tela de 360px
- **Quando** cria, edita ou inativa um serviço
- **Então** volta para a lista com um `Alert` de sucesso e vê a situação atualizada. Se a API recusar, o formulário mostra o `message` dela num `Alert` `danger` e mantém o que foi digitado, inclusive os barbeiros marcados.

## Fluxo e telas
- **`/admin/cadastros`** ganha o atalho "Serviços".
- **`/admin/cadastros/servicos`:** lista de todos os serviços, os ativos primeiro e depois por nome.
  - Cada item mostra o nome, o preço em reais (`tabular-nums`), a duração ("30 min", "1h 30min"), quem realiza ("Edvaldo, Lauro e Manoel"), um `Badge` "Ativo" ou "Inativo" e o link "Editar".
  - O botão "Novo serviço" leva ao formulário de criação.
  - Sem serviços, um `EmptyState` com o mesmo botão.
  - A lista mostra o `Alert` de sucesso quando volta de um formulário ("Serviço cadastrado." ou "Serviço atualizado.").
- **`/admin/cadastros/servicos/novo`** e **`/admin/cadastros/servicos/{id}`:** o mesmo formulário, com:
  - nome;
  - descrição (opcional), com até 400 caracteres;
  - preço, um campo de texto com teclado decimal e a dica "Em reais, como 25,00.";
  - duração em minutos, um campo numérico com a dica "Múltiplo de 5, no mínimo 10 minutos.";
  - "Quem realiza", um `<fieldset>` com uma caixa de seleção (`Checkbox`) por barbeiro cadastrado. O inativo aparece com "(inativo)" no rótulo;
  - só na edição, a situação (Ativo/Inativo), com a dica de que o inativo some da vitrine e não recebe agendamentos novos.

  O formulário funciona sem JS (Server Action e campos nativos). Durante o envio, o botão fica em `pending`. Depois de salvar, volta para a lista. Um id inexistente mostra a página 404. Se a lista de barbeiros não carregar, a página mostra o aviso de indisponibilidade no lugar do formulário.

## API
| Método | Caminho | Quem | O que faz |
|---|---|---|---|
| `GET` | `/admin/services` | Administração | Todos os serviços, ativos primeiro e depois por nome |
| `POST` | `/admin/services` | Administração | Cria um serviço ativo; responde `201` |
| `GET` | `/admin/services/{id}` | Administração | Um serviço, para o formulário de edição |
| `PATCH` | `/admin/services/{id}` | Administração | Altera só os campos enviados, incluindo `barber_ids` e `active` |

- A entrada usa `{ name, description, price, duration_minutes, barber_ids }` (mais `active` no `PATCH`).
- O serviço trafega como `{ id, name, description, price, duration_minutes, active, barbers }`, em que `barbers` é a lista `{ id, name, active }` dos barbeiros que o realizam, por nome.

## Fora do escopo desta spec
- A rota pública e a vitrine com os serviços ativos: S3.05 (#54).
- O uso da duração e dos barbeiros no cálculo de horários (RN-05): S3.07 (#56).
- Regras entre serviço e agendamento, como não excluir com histórico ou congelar o preço (RN-13): não há agendamentos ainda.
- Foto ou ícone do serviço.
- Excluir serviço.

## Dúvidas em aberto
- Lista real de serviços, com preço e duração: pendência P9, resolvida na apresentação.
- Escolhas desta implementação que nenhuma RN decide, a confirmar:
  - o teto de 1440 minutos para a duração é só técnico (evita estourar o `integer`), não uma regra de negócio;
  - um barbeiro inativo pode continuar ligado ao serviço, e "pelo menos um barbeiro" conta também os inativos;
  - a descrição tem até 400 caracteres, como a apresentação do barbeiro;
  - o nome do serviço não é único.
