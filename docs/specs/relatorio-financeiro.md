# Spec — Relatório financeiro

- **Issue:** #99 (S5.07)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** implementada

## Contexto
Os proprietários querem saber quanto a barbearia faturou num período, quanto coube a cada barbeiro, como os clientes pagaram e quantas faltas houve. Hoje isso sai do caderno. O relatório lê o que a conclusão do atendimento (S5.06, [conclusao-atendimento.md](conclusao-atendimento.md)) grava: todo valor do financeiro vem de um atendimento concluído, sem lançamento avulso (RN-44). É leitura pura: nenhuma rota desta issue altera o banco.

## Quem usa
Administração. O cliente e o visitante não acessam (RN-70).

## Histórias
- Como **proprietário**, quero **escolher um período e ver o faturamento total** para **saber se o mês fechou bem**.
- Como **proprietário**, quero **ver o faturamento por barbeiro e filtrar por um** para **acertar a comissão de cada um**.
- Como **proprietário**, quero **ver quanto entrou em dinheiro, Pix, débito e crédito** para **conferir o caixa e a maquininha**.
- Como **proprietário**, quero **ver quantas faltas houve** para **saber quanto horário se perde**.
- Como **proprietário**, quero **a lista dos atendimentos que compõem o total** para **conferir cada valor**.

## Regras envolvidas
- RN-01 — Fuso horário (o período são dias de São Paulo; as datas saem em `-03:00`)
- RN-13 — Preço congelado (o relatório soma o valor **cobrado** do pagamento, não o preço do agendamento)
- RN-30 — Status (só `COMPLETED` entra no faturamento; `NO_SHOW` só na contagem de faltas; `SCHEDULED` e `CANCELED` não entram)
- RN-40 — Conclusão com pagamento (a origem dos valores; cortesia de R$ 0,00 é um atendimento concluído)
- RN-41 — Correção (vale o valor corrigido, que é o que está em `payments`)
- RN-42 — Faturamento por barbeiro (o valor conta para o barbeiro do agendamento)
- RN-43 — Relatório financeiro (período obrigatório, filtro opcional por barbeiro, os quatro blocos)
- RN-44 — Todo valor vem de um atendimento concluído
- RN-70 e RN-71 — Só a administração

Nenhuma regra nova: as escolhas abaixo detalham as existentes e estão em "Dúvidas em aberto".

## Definições desta funcionalidade
- **Período:** duas datas locais de São Paulo, `start` e `end`, as duas inclusivas, ambas obrigatórias. `end` antes de `start` é recusado. O período tem **no máximo 366 dias** (`end − start ≤ 365`), um ano, para a lista não crescer sem limite.
- **Data de referência:** o atendimento pertence ao dia em que **começa** (`starts_at`), não ao dia em que foi concluído (`closed_at`). É a data que a agenda mostra ([agenda-admin.md](agenda-admin.md)), então o relatório de um dia bate com a agenda do mesmo dia. Entra o que tem `starts_at` em `[00:00 de start, 00:00 do dia seguinte a end)` no fuso de São Paulo, convertido para UTC só na consulta (RN-01). Um atendimento às 22h de São Paulo (01h do dia seguinte em UTC) é do dia em que começa.
- **Concluídos:** agendamentos `COMPLETED` do período (e do barbeiro, se houver filtro). Cada um tem exatamente um `Payment`: a conclusão grava os dois na mesma transação (S5.06), e o relatório **parte dessa premissa** (junção interna). Um `COMPLETED` sem `Payment`, que só existiria por escrita direta no banco, não apareceria em nada. O **faturamento** é a soma do `amount` desses pagamentos.
- **Faltas:** agendamentos `NO_SHOW` do período (e do barbeiro). Não têm valor.
- **Fora das somas:** `SCHEDULED` (ainda não fechado) e `CANCELED` não entram em nada.
- **Barbeiro:** o do agendamento (RN-42), mesmo que tenha sido inativado depois.
- **Dinheiro:** `numeric(10,2)` no banco, `Decimal` na API, string decimal com duas casas na resposta (`"125.00"`). Os totais são somados em `Decimal` a partir da **própria lista** dos concluídos, lida numa só consulta (ver "API"), e nunca passam por `float`. Sem nenhum concluído, o total é `"0.00"`.

## Critérios de aceite

**CA-1 — Totais do período (RN-43, RN-40)**
- **Dado** atendimentos concluídos de vários barbeiros e formas de pagamento no período, mais um agendado, um cancelado e uma falta
- **Quando** a administração chama `GET /admin/reports/financial?start=2026-11-01&end=2026-11-30`
- **Então** a API responde `200` com `start`, `end`, `barber_id` (`null` sem filtro), `total` (a soma dos valores cobrados), `completed_count`, `no_show_count`, `by_barber`, `by_method` e `completed`. O agendado e o cancelado não entram em nenhum número; a falta só em `no_show_count`.

**CA-2 — Os números batem entre si (RN-43)**
- **Então** `total` é igual à soma de `amount` em `completed`, à soma de `total` em `by_barber` e à soma de `total` em `by_method`; `completed_count` é o tamanho de `completed` e a soma de `completed_count` de `by_barber` e de `by_method`.

**CA-3 — Valor cobrado, não o preço (RN-13, RN-40, RN-41)**
- **Dado** um atendimento de R$ 35,00 cobrado com desconto (R$ 30,00), outro de cortesia (R$ 0,00) e um corrigido de R$ 35,00 para R$ 40,00
- **Então** o relatório soma 30,00 + 0,00 + 40,00. A cortesia conta em `completed_count` e aparece na lista com `"0.00"`.

**CA-4 — Por barbeiro (RN-42)**
- `by_barber` traz uma linha por barbeiro com `barber` (`id`, `name`, `active`), `total`, `completed_count` e `no_show_count`, na ordem do banco (nome e id, como o resto da administração). Sem filtro, vêm os barbeiros **ativos** (mesmo sem atendimento, com zeros) e os **inativos que tenham concluído ou falta no período**. O valor de cada atendimento conta para o barbeiro do agendamento: trocar o cadastro do serviço ou inativar o barbeiro depois não move o valor.

**CA-5 — Por forma de pagamento (RN-43)**
- `by_method` traz sempre as **quatro** formas (`CASH`, `PIX`, `DEBIT`, `CREDIT`), nessa ordem, cada uma com `total` e `count`, mesmo com zero.

**CA-6 — Filtro por barbeiro (RN-43)**
- **Quando** a chamada inclui `barber_id`
- **Então** todos os números, as faltas e a lista são só daquele barbeiro, e `by_barber` tem só ele (ativo ou não). Um `barber_id` que não existe responde `404` com `code` = `BARBER_NOT_FOUND` e "Barbeiro não encontrado.".

**CA-7 — Faltas (RN-43)**
- `no_show_count` conta os `NO_SHOW` do período e do filtro, e é o único número que eles alimentam.

**CA-8 — Lista dos concluídos**
- `completed` traz, por início, nome do barbeiro e id: `appointment_id`, `starts_at` (`-03:00`, RN-01), `customer` (`id`, `name`), `barber` (`id`, `name`), `service` (`id`, `name`), `amount` e `method`. Sem concluídos, a lista é vazia.

**CA-9 — Borda do fuso (RN-01)**
- **Dado** um atendimento concluído às 22h de São Paulo do dia 10 (01h UTC do dia 11) e outro às 00h do dia 11
- **Quando** a administração pede só o dia 10, e depois só o dia 11
- **Então** o das 22h vem só no dia 10, e o da meia-noite só no dia 11. Na virada do mês, o atendimento às 23h30 do último dia fica no mês certo.

**CA-10 — Período inválido (RN-43)**
- `end` antes de `start`: `422` com `code` = `INVALID_PERIOD` e "A data final precisa ser igual ou posterior à inicial.".
- Mais de 366 dias: `422` `INVALID_PERIOD` e "Escolha um período de até 366 dias.".
- `end` = `9999-12-31`: `422` `INVALID_PERIOD` e "Escolha uma data válida." (o período não teria como terminar).
- Data ausente ou em outro formato: `422 VALIDATION_ERROR`.
- Um período de exatamente 366 dias é aceito (inclusive um ano bissexto).

**CA-11 — Só a administração (RN-70, RN-71)**
- Sem token, `401`; cliente, `403`.

**CA-12 — Tela `/admin/relatorio`**
- **Dado** a administração em `/admin/relatorio` sem parâmetros
- **Então** vê o relatório de **Este mês** (do dia 1 ao último dia do mês de hoje, em São Paulo): o período por extenso, o formulário de período, os cartões com o faturamento total, a quantidade de atendimentos concluídos e a quantidade de faltas, o faturamento por barbeiro, por forma de pagamento (as quatro) e a lista dos concluídos. Valores com `formatPrice`; nada passa por `number`.
- Sem concluídos no período, a tela mostra "Nenhum atendimento concluído neste período." no lugar da lista, e os totais em R$ 0,00.

**CA-13 — Período e filtro na URL, sem JS**
- O estado fica na URL: `?inicio=AAAA-MM-DD&fim=AAAA-MM-DD&barbeiro=<id>`. Se `inicio` e `fim` não forem **ambas** datas válidas, vale Este mês; `barbeiro` inválido, ou que não está na lista de barbeiros, vale "todos": a tela ignora o filtro e o campo mostra "Todos", em vez de um erro com o filtro fingindo estar limpo.
- Os atalhos "Hoje", "Esta semana" (segunda a domingo da semana de hoje, como na agenda) e "Este mês" são links que mantêm o barbeiro. O atalho do período atual tem `aria-current`.
- Um formulário `GET` com "De", "Até" e "Barbeiro" (lista nativa com "Todos") e o botão "Ver relatório" leva a qualquer período. Tudo é link ou formulário `GET`: funciona sem JS.
- Período recusado pela API (ex.: `fim` antes de `inicio`): um `Alert` `danger` com o `message` da API no lugar do relatório, e o formulário continua com o que foi digitado. Falha de leitura: o `message` da API, ou "Não foi possível carregar o relatório. Tente novamente em instantes.".

**CA-14 — Navegação e 360px**
- A navegação da administração ganha "Relatório" (depois de "Clientes", antes de "Cadastros"), e `/admin` ganha o atalho. `loading.tsx` com esqueleto.
- Em 360px, os cartões e os campos ficam um embaixo do outro; a lista é uma lista de cartões, sem tabela e sem rolagem horizontal; nomes longos quebram.

## Fluxo e telas

```mermaid
flowchart LR
    N[Navegação: Relatório] --> R[/admin/relatorio?inicio=&fim=&barbeiro=<br/>GET /admin/reports/financial + GET /admin/barbers/]
    R -->|Hoje / Esta semana / Este mês<br/>ou formulário De, Até, Barbeiro| R
```

- **Topo:** título "Relatório financeiro", o período por extenso, os atalhos e o formulário.
- **Resumo:** três cartões (Faturamento, Atendimentos concluídos, Faltas).
- **Detalhe:** duas listas lado a lado a partir de `lg` (por barbeiro e por forma de pagamento), e abaixo a lista dos concluídos: data e hora, cliente, serviço, barbeiro, forma e valor.
- **Estados:** carregando (`loading.tsx`), erro (`Alert`) e vazio (texto).
- **Sem gráficos e sem exportação.**

## API
| Método | Caminho | Quem | O que faz |
|---|---|---|---|
| `GET` | `/admin/reports/financial?start=&end=&barber_id=` | Administração (`require_admin`) | O relatório do período: totais, por barbeiro, por forma de pagamento, faltas e a lista dos concluídos |

- Módulo novo `app/modules/reports/` (`router.py`, `schemas.py`, `service.py`). Ele fica **acima** de `payments`, `agenda` e `barbers`: lê `Appointment`, `Payment`, `Customer`, `Barber` e `Service`, reaproveita `period_bounds` de `agenda.service` e `get_barber` de `barbers.service`, e ninguém o importa. Não mora em `payments` para não acoplar o fechamento do atendimento (escrita) a uma leitura agregada, e não cria ciclo.
- A data entra como data local (`AAAA-MM-DD`) e vira instante de São Paulo no `service.py`; as respostas saem em `-03:00` (RN-01).
- Consultas: a lista dos concluídos (com as junções de cliente, barbeiro e serviço, no período e no barbeiro) e a contagem de faltas por barbeiro. O total, a quantidade de concluídos e os totais por barbeiro e por forma de pagamento são somados em `Decimal` a partir da lista, então o CA-2 vale sempre, mesmo que um pagamento seja corrigido durante a montagem (com agregados separados em `READ COMMITTED`, cada consulta poderia ver um estado diferente). A soma em Python é exata porque os valores são `numeric(10,2)`.
- Índices: nenhum novo. A agenda lê pelo mesmo filtro de `starts_at` sem índice dedicado, e o volume de uma barbearia (dezenas de atendimentos por dia, no máximo alguns milhares por ano) não justifica uma migração; se crescer, o índice entra numa issue própria.

## Fora do escopo desta spec
- Exportação (CSV ou PDF) e gráficos: vão para o backlog se os proprietários pedirem.
- Comissão, percentual do barbeiro, despesas, lucro e taxa da maquininha.
- Comparar com o período anterior.
- Paginação da lista (o limite de 366 dias a mantém num tamanho razoável).
- Receita prevista dos agendamentos ainda `SCHEDULED`.

## Dúvidas em aberto
Escolhas desta implementação que nenhuma RN decide, a confirmar com a barbearia:
- **Data de referência:** vale o início do atendimento (`starts_at`), não o momento da conclusão. Efeito: um atendimento de 31/10 às 23h30 concluído só em 02/11 conta em outubro. A alternativa (`closed_at`) faria o caixa do dia bater com o dia em que o dinheiro foi registrado, mas o relatório deixaria de bater com a agenda.
- **Limite de 366 dias** e **lista sem paginação**: conservador para o MVP; se os proprietários pedirem mais de um ano, a lista precisa de paginação.
- **Padrão da tela:** "Este mês" quando não há período na URL.
- **"Esta semana":** de segunda a domingo, inclusive os dias que ainda não chegaram (como a agenda).
- **Barbeiro inativo** aparece em `by_barber` só se tiver concluído ou falta no período; os ativos aparecem sempre.
- **Atendimentos ainda `SCHEDULED` cujo horário já passou** não entram no faturamento até serem concluídos (RN-44); o relatório não avisa que há pendências de fechamento.
