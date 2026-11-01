# Spec — Modelo de agendamento e motor de disponibilidade

- **Issue:** #56 (S3.07)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** implementada

## Contexto
O agendamento online só funciona se o sistema souber, com certeza, quais horários estão livres para um barbeiro e um serviço num dia, e se o banco impedir que dois clientes fiquem com o mesmo horário, mesmo quando confirmam ao mesmo tempo (O2, sem sobreposição). Esta funcionalidade cria a tabela de agendamentos, com a garantia da RN-08 no próprio banco, e o cálculo dos horários disponíveis (RN-05), entregue por uma rota pública. A criação do agendamento pelo cliente vem na S3.08 e usa o que esta issue deixa pronto.

## Quem usa
Visitante e cliente (consultam os horários livres). A administração é afetada pela trava da RN-60 ao inativar um barbeiro.

## Histórias
- Como **cliente**, quero **ver os horários livres de um barbeiro para o serviço que escolhi, num dia** para **escolher um horário que realmente existe**.
- Como **barbearia**, quero **que o sistema nunca aceite dois agendamentos no mesmo horário do mesmo barbeiro** para **não ter cliente esperando nem atendimento dobrado**.
- Como **administração**, quero **ser impedida de inativar um barbeiro que ainda tem clientes agendados** para **nenhum cliente ficar com um agendamento órfão**.

## Regras envolvidas
- RN-01 — Fuso horário
- RN-02 — Horário de funcionamento
- RN-04 — Grade de horários
- RN-05 — Horário disponível
- RN-06 — Antecedência mínima
- RN-07 — Janela de agendamento
- RN-08 — Sem sobreposição
- RN-13 — Preço e duração congelados
- RN-30 — Status
- RN-33 — Rastreabilidade (só os campos de cancelamento, sem o fluxo)
- RN-60 — Barbeiro (a trava de inativação)
- RN-03 — Bloqueios (entram na lista de ocupados desde a S5.04, [bloqueios.md](bloqueios.md))

## Modelo
- **Agendamento (`Appointment`)**, tabela `appointments`, no módulo `app/modules/appointments/`:
  - `customer_id`, `barber_id` e `service_id`: obrigatórios, com chave estrangeira para `customers`, `barbers` e `services`;
  - `starts_at` e `ends_at`: `timestamptz` (RN-01). O intervalo ocupado é `[starts_at, ends_at)`, fechado no início e aberto no fim: um agendamento que termina às 10h45 não cruza outro que começa às 10h45;
  - `price` (`numeric(10,2)`, ≥ 0) e `duration_minutes` (> 0): **cópias** do serviço no momento da criação (RN-13). Mudar o serviço depois não altera o agendamento;
  - `status`: `SCHEDULED`, `COMPLETED`, `CANCELED` ou `NO_SHOW` (RN-30), com `SCHEDULED` como padrão (RN-12);
  - `source`: `ONLINE` ou `ADMIN`, quem criou o agendamento;
  - `canceled_at` e `canceled_by` (`CUSTOMER` ou `ADMIN`): quando e por quem foi cancelado (RN-33). Os dois existem só quando o status é `CANCELED`;
  - `created_at` e `updated_at`, em `timestamptz`.
- Status, origem e quem cancelou são texto com `CHECK` no banco e `StrEnum` no código, não enum nativo do Postgres.
- `CHECK`s no banco, como última barreira: `ends_at = starts_at + duration_minutes`, preço ≥ 0, duração > 0, os valores de status, origem e quem cancelou, e a coerência entre `CANCELED` e os campos de cancelamento.
- **RN-08 no banco:** a migração `0006` cria a exclusion constraint `ex_appointments_barber_overlap`, que usa a extensão `btree_gist` (migração `0001`):

  ```sql
  EXCLUDE USING gist (barber_id WITH =, tstzrange(starts_at, ends_at, '[)') WITH &&)
    WHERE (status = 'SCHEDULED')
  ```

  Só `SCHEDULED` ocupa a agenda. Um agendamento cancelado, concluído ou com falta não bloqueia o horário (RN-32). Duas transações simultâneas que tentam o mesmo intervalo: a segunda espera a primeira e, se ela confirmar, falha com `ExclusionViolation` (SQLSTATE `23P01`); se a primeira desistir, a segunda fica com o horário. Quando as duas gravam no índice no mesmo instante, cada uma espera a outra e o Postgres desfaz uma delas com `DeadlockDetected` (`40P01`), depois de cerca de 1 segundo. Nos dois casos só uma confirma. `is_slot_conflict` (`appointments/service.py`) reconhece os dois erros, e a S3.08 responde com ele "Este horário não está mais disponível. Escolha outro.".
- Um índice em `customer_id` atende a lista "Meus agendamentos" e o limite da RN-11 nas próximas issues.

## Cálculo dos horários (RN-05)
O cálculo é uma **função pura** em `app/modules/availability/slots.py`: não acessa banco nem relógio. Ela recebe o dia (data local de São Paulo), o horário de funcionamento do dia (ou "fechado"), a duração do serviço, se o barbeiro e o serviço estão ativos e se o barbeiro realiza o serviço, os **intervalos ocupados** do barbeiro, o momento atual e a política de antecedência e janela. Ela devolve os horários de início disponíveis, cada um com o seu fim.

Um início `H` é oferecido quando:
1. o barbeiro e o serviço estão ativos e o barbeiro realiza o serviço (RN-05, item 5). Se não, não há horário nenhum;
2. o dia não está fechado (RN-02);
3. `H` está na grade: começa na abertura do dia e anda de 30 em 30 minutos (RN-04);
4. `[H, H + duração)` termina até o fechamento (RN-02);
5. `[H, H + duração)` não cruza nenhum intervalo ocupado (RN-05, itens 3 e 4);
6. `H` é pelo menos 1 hora depois de agora (RN-06): `H ≥ agora + 1h`;
7. o dia de `H` é no máximo 30 dias depois de hoje, contando em dias do calendário de São Paulo (RN-07). Hoje é o dia 0, e o dia 30 inteiro ainda é oferecido.

A conversão para São Paulo acontece na borda: a abertura e o fechamento são horas locais (`time`), combinadas com a data no fuso `America/Sao_Paulo` e comparadas como instantes. O resultado sai no fuso de São Paulo (`-03:00`).

Os intervalos ocupados são genéricos: os agendamentos `SCHEDULED` do barbeiro que cruzam o dia e, desde a S5.04 (#96), os bloqueios dele (RN-03, [bloqueios.md](bloqueios.md)), lidos juntos em `_busy` (`service.py`) sem mudar a função. Por isso o bloqueio vale para o cliente, a remarcação e a administração. As regras 6 e 7 vêm de uma política (`BookingPolicy`). A do cliente (`CUSTOMER_POLICY`) tem 1 hora e 30 dias. A política da administração (RN-21, sem antecedência nem janela) é definida quando o agendamento pela administração entrar.

### Exemplo (RN-05)
Segunda-feira, das 10h às 19h, Corte + Barba (45 min). O barbeiro já tem um agendamento das 10h00 às 10h45. O primeiro início oferecido é **11h00**: 10h00 e 10h30 cruzam o agendamento. O último é **18h00**, porque 18h30 + 45 min passa das 19h.

### Função reutilizável para a S3.08
`app/modules/availability/service.py` expõe:
- `list_available_slots(session, barber_id=, service_id=, day=, now=, policy=)`: carrega os dados e chama a função pura;
- `is_slot_available(session, barber_id=, service_id=, starts_at=, now=, policy=)`: `True` se `starts_at` é exatamente um dos inícios oferecidos naquele dia;
- `ensure_slot_available(...)`: o mesmo, mas levanta `409 SLOT_UNAVAILABLE` ("Este horário não está mais disponível. Escolha outro.") e trava a linha do barbeiro com `FOR SHARE` até o fim da transação. É o ponto de entrada da criação: a trava serializa a criação com a inativação do barbeiro (RN-60) e com a criação de bloqueios (RN-03, S5.04), e a exclusion constraint continua sendo a garantia final da RN-08.
- `is_slot_conflict(error)` (`app/modules/appointments/service.py`): `True` quando o insert perdeu a disputa pelo horário (violação de `ex_appointments_barber_overlap` ou deadlock), para a S3.08 responder o mesmo `SLOT_UNAVAILABLE`.

## Trava da RN-60
Ao receber `PATCH /admin/barbers/{id}` com `active: false` para um barbeiro ativo, a API trava a linha do barbeiro (`FOR UPDATE`) e procura agendamentos `SCHEDULED` dele que ainda não terminaram (`ends_at > agora`). Se houver, recusa com `409 BARBER_HAS_FUTURE_APPOINTMENTS` e nada muda. Agendamentos que já terminaram e ficaram `SCHEDULED` (a administração ainda não concluiu nem marcou falta) não impedem.

## Critérios de aceite

**CA-1 — Exemplo da RN-05**
- **Dado** um barbeiro com um agendamento das 10h00 às 10h45 numa segunda-feira das 10h às 19h
- **Quando** se calcula a disponibilidade do Corte + Barba (45 min) nesse dia
- **Então** 10h00 e 10h30 não aparecem, o primeiro início é 11h00 e o último é 18h00.

**CA-2 — Grade e fim do expediente (RN-02, RN-04)**
- **Dado** o sábado das 9h às 14h, sem agendamentos
- **Quando** se calcula a disponibilidade do Corte + Barba (45 min)
- **Então** os inícios são 9h00, 9h30 … 13h00, de 30 em 30 minutos. 13h30 não aparece porque terminaria às 14h15. Com o Corte Simples (30 min), 13h30 aparece. Uma abertura às 9h15 gera 9h15, 9h45….

**CA-3 — Dia fechado (RN-02)**
- **Dado** o domingo fechado
- **Quando** se calcula a disponibilidade
- **Então** não há horário nenhum.

**CA-4 — Antecedência mínima (RN-06)**
- **Dado** agora é 10h10 de uma segunda-feira
- **Quando** se calcula a disponibilidade de hoje
- **Então** o primeiro início é 11h30. Com agora às 10h00 em ponto, 11h00 aparece. Um dia que já passou não tem horários.

**CA-5 — Janela de 30 dias (RN-07)**
- **Dado** hoje em São Paulo
- **Quando** se calcula a disponibilidade de hoje + 30 dias e de hoje + 31 dias
- **Então** o primeiro dia tem horários, inclusive à noite, e o segundo não tem nenhum.

**CA-6 — Fuso de São Paulo (RN-01)**
- **Dado** o momento atual e os agendamentos em UTC
- **Quando** se calcula a disponibilidade
- **Então** a abertura, a antecedência, a janela e os intervalos ocupados são comparados no fuso de São Paulo, e os horários saem com `-03:00`. Às 23h30 de São Paulo, que já é o dia seguinte em UTC, "hoje" continua sendo o dia de São Paulo.

**CA-7 — Barbeiro, serviço e quem realiza (RN-05, item 5)**
- **Dado** um barbeiro inativo, um serviço inativo ou um barbeiro que não realiza o serviço
- **Quando** se calcula a disponibilidade
- **Então** não há horário nenhum.

**CA-8 — Só agendamentos ativos ocupam (RN-08, RN-30, RN-32)**
- **Dado** agendamentos `CANCELED`, `COMPLETED` ou `NO_SHOW`, ou de outro barbeiro
- **Quando** se calcula a disponibilidade
- **Então** eles não ocupam o horário. Um agendamento `SCHEDULED` do barbeiro ocupa.

**CA-9 — Rota pública**
- **Dado** um visitante sem token
- **Quando** chama `GET /public/availability?barber_id=&service_id=&date=AAAA-MM-DD`
- **Então** recebe `200` com `{ barber_id, service_id, date, slots }`, em que cada item de `slots` tem `starts_at` e `ends_at` com `-03:00`, em ordem. Um barbeiro ou serviço que não existe responde `404` (`BARBER_NOT_FOUND` ou `SERVICE_NOT_FOUND`). Parâmetro ausente ou data inválida responde `422 VALIDATION_ERROR`.

**CA-10 — Sem sobreposição, mesmo com concorrência (RN-08)**
- **Dado** um agendamento `SCHEDULED` de um barbeiro
- **Quando** outro agendamento `SCHEDULED` do mesmo barbeiro cruza o intervalo, inclusive em duas transações simultâneas
- **Então** o banco recusa o segundo com `ExclusionViolation` (ou, se os dois gravaram no mesmo instante, desfaz um deles com deadlock), e só um fica gravado. Encostar no fim (`10h45` depois de `10h00–10h45`), outro barbeiro ou um agendamento cancelado no mesmo horário são aceitos.

**CA-11 — Preço e duração congelados (RN-13)**
- **Dado** um agendamento com o preço e a duração do serviço
- **Quando** a administração muda o preço e a duração do serviço
- **Então** o agendamento continua com os valores antigos.

**CA-12 — Trava da RN-60**
- **Dado** um barbeiro com um agendamento `SCHEDULED` que ainda não terminou
- **Quando** a administração envia `PATCH /admin/barbers/{id}` com `active: false`
- **Então** a API responde `409` com `code` = `BARBER_HAS_FUTURE_APPOINTMENTS` e "Este barbeiro tem agendamentos marcados. Cancele ou remarque esses agendamentos antes de inativá-lo.", e o barbeiro continua ativo. Sem agendamento futuro (só passados, cancelados ou de outro barbeiro), a inativação funciona. A tela de edição já mostra o `message` da API.

## Fluxo e telas
Nenhuma tela nesta issue. A escolha de horário pelo cliente é a S3.08.

## API
| Método | Caminho | Quem | O que faz |
|---|---|---|---|
| `GET` | `/public/availability?barber_id=&service_id=&date=` | Qualquer um, sem token | Horários de início disponíveis do barbeiro para o serviço na data local (`AAAA-MM-DD`), com a política do cliente (RN-06, RN-07) |
| `PATCH` | `/admin/barbers/{id}` | Administração | Passa a recusar `active: false` com agendamentos futuros (RN-60) |

- Uma data passada ou além da janela responde `200` com `slots` vazio, como um dia sem horários.
- Os inícios usam o relógio do servidor. Nos testes, a dependência `utc_now` (`app/clock.py`) é substituída.

## Fora do escopo desta spec
- **Bloqueios (RN-03):** a tabela, a tela e a entrada no cálculo vieram na S5.04 (#96), em [bloqueios.md](bloqueios.md). A criação do bloqueio trava o barbeiro com `FOR UPDATE`, a mesma linha que `ensure_slot_available` trava com `FOR SHARE`, para não correr junto com uma reserva.
- **Criar agendamento** (cliente ou administração), a tradução do erro da constraint e o limite da RN-11: S3.08 (#57) em diante.
- Cancelar, remarcar, concluir e marcar falta. Os campos de cancelamento existem, mas nenhum fluxo os preenche ainda.
- A política da administração (RN-21) e o "encaixe".
- Qualquer tela.

## Dúvidas em aberto
Escolhas desta implementação que nenhuma RN decide, a confirmar:
- **Janela de 30 dias (RN-07) em dias do calendário:** hoje + 30 dias, o dia inteiro. A alternativa, "até agora + 30 × 24h", cortaria o último dia no meio.
- **"Agendamentos ativos no futuro" (RN-60)** conta os que ainda não terminaram (`ends_at > agora`), inclusive o que está em andamento.
- **Barbeiro ou serviço inativo, ou barbeiro que não realiza o serviço,** devolvem lista vazia na rota pública, não erro. Só o que não existe responde `404`.
- **Antecedência (RN-06)** inclusiva: um início exatamente 1 hora depois de agora é oferecido.
- **"Quem concluiu ou marcou falta" (RN-33)** não ganhou campo: só a administração faz isso (RN-31). Se for preciso saber qual pessoa da administração, os campos entram com a conclusão.
