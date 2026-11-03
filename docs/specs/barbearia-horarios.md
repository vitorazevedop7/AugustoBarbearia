# Spec — Barbearia e horário de funcionamento

- **Issues:** #51 (S3.02), #105 (proteção dos agendamentos ao mudar o expediente)
- **Fase:** 1 (MVP) (ver `docs/produto/roadmap.md`)
- **Status:** implementada

## Contexto
A vitrine, os e-mails e o motor de disponibilidade precisam dos dados da barbearia (nome, endereço, contato e textos da vitrine) e do horário de funcionamento. Hoje esses dados estão fixos no código do web. Esta funcionalidade guarda tudo no banco, entrega à vitrine por uma rota pública e permite que a administração altere sem depender de deploy (O1, operação simples). É também a primeira tela de cadastro, então ela cria o layout da área `/admin`.

## Quem usa
Administração (edita). Visitante e cliente (leem pela vitrine, nas próximas issues).

## Histórias
- Como **administração**, quero **alterar o horário de funcionamento de um dia** para **o site oferecer só os horários em que a barbearia abre**.
- Como **administração**, quero **manter o endereço e o contato da barbearia** para **a vitrine e os e-mails mostrarem a informação certa**.
- Como **visitante**, quero **ver o endereço, o contato e o horário de funcionamento** para **saber quando e onde ir**.

## Regras envolvidas
- RN-01 — Fuso horário
- RN-02 — Horário de funcionamento
- RN-05 — Horário disponível (o intervalo inteiro precisa caber no expediente)
- RN-30 — Status (só `SCHEDULED` futuro impede a mudança)
- RN-70 — Perfis e permissões
- RN-71 — Acesso à administração

## Modelo
- **Barbearia (`Shop`)** é um registro único (`id = 1`, garantido por constraint). Campos: nome (obrigatório) e, opcionais, frase de destaque, texto "sobre", endereço, telefone, WhatsApp, Instagram e e-mail.
  - Telefone e WhatsApp são guardados só com dígitos: DDD + número, 10 ou 11 dígitos.
  - O Instagram é guardado sem `@`.
  - Os campos de contato começam vazios, porque o repositório não tem os dados reais. A administração os preenche pela tela.
- **Horário de funcionamento (`BusinessHours`)** tem uma linha por dia da semana (`weekday`, 0 = segunda … 6 = domingo, como o `date.weekday()` do Python):
  - abertura e fechamento são horas locais de São Paulo (`time` sem fuso, RN-01), sem segundos;
  - os dois vazios significam fechado;
  - uma constraint no banco garante que os dois estão vazios, ou os dois preenchidos com a abertura antes do fechamento;
  - a migração cria os 7 dias com o padrão da RN-02: seg–sex 10h–19h, sáb 9h–14h, dom fechado.

## Critérios de aceite

**CA-1 — Dados iniciais (RN-02)**
- **Dado** um banco recém-migrado
- **Quando** alguém chama `GET /public/shop`
- **Então** recebe o nome "Augusto Barbearia" e os 7 dias em ordem, com seg–sex 10:00–19:00, sáb 09:00–14:00 e dom fechado.

**CA-2 — Rota pública sem login**
- **Dado** um visitante sem token
- **Quando** chama `GET /public/shop`
- **Então** recebe 200.

**CA-3 — Administração altera o horário (RN-02)**
- **Dado** a administração autenticada e nenhum agendamento futuro afetado
- **Quando** envia `PUT /admin/business-hours` com os 7 dias, fechando a segunda-feira
- **Então** recebe os 7 dias atualizados, e `GET /public/shop` mostra a segunda como fechada.

**CA-4 — Abertura depois do fechamento (RN-02)**
- **Dado** a administração autenticada
- **Quando** envia um dia com abertura 19:00 e fechamento 10:00 (ou com só um dos dois preenchido)
- **Então** a API responde `422` com `code` = `INVALID_BUSINESS_HOURS` e uma mensagem que cita o dia e o problema: "Na segunda-feira, a abertura precisa ser antes do fechamento." para a ordem, e "Na segunda-feira, informe o horário de fechamento." (ou "de abertura") quando falta uma das horas (#158). Nada é gravado.

**CA-5 — Semana incompleta (RN-02)**
- **Dado** a administração autenticada
- **Quando** envia menos de 7 dias ou um dia repetido
- **Então** a API responde `422` com `code` = `INVALID_BUSINESS_HOURS` e "Informe o horário dos sete dias da semana.".

**CA-6 — Administração altera os dados**
- **Dado** a administração autenticada
- **Quando** envia `PUT /admin/shop` com endereço, telefone formatado "(75) 99999-0000" e Instagram "@augusto"
- **Então** os dados são salvos normalizados (`75999990000`, `augusto`) e aparecem no `GET /public/shop`.

**CA-7 — Telefone inválido**
- **Dado** a administração autenticada
- **Quando** envia um telefone que não tem 10 ou 11 dígitos
- **Então** a API responde `422` com `code` = `VALIDATION_ERROR`.

**CA-8 — Só a administração altera (RN-70, RN-71)**
- **Dado** um cliente autenticado, ou alguém sem token
- **Quando** chama `PUT /admin/shop` ou `PUT /admin/business-hours`
- **Então** recebe `403` (cliente) ou `401` (sem token), e nada muda.

**CA-9 — Tela de cadastro**
- **Dado** a administração em `/admin/cadastros/barbearia`, no celular
- **Quando** altera um horário ou um dado e salva
- **Então** vê o `Alert` de sucesso. Se a API recusar, vê o `message` dela num `Alert` `danger`.

**CA-10 — Não deixar agendamentos futuros fora do expediente (RN-02, RN-05, RN-30)**
- **Dado** um agendamento `SCHEDULED` com `starts_at` depois de agora
- **Quando** a administração envia um expediente que fecha o dia, abre depois do início do agendamento ou fecha antes do fim dele
- **Então** a API responde `409 BUSINESS_HOURS_CONFLICT` com "Há 2 agendamentos futuros fora do novo horário de funcionamento. Remarque ou cancele esses agendamentos antes de alterar o horário." (no singular com 1), `appointments` (até 20, do mais próximo ao mais distante: `id`, `starts_at` e `ends_at` em `-03:00`, `barber_name`, `customer_name`) e `total`. Nenhum dos sete dias é alterado, e os agendamentos ficam como estavam (#124).
- Só contam os dias cujo horário muda. Um agendamento que já estava fora do expediente impede a mudança do dia dele, não a de outros dias (D15).
- Um agendamento que começa exatamente na abertura ou termina exatamente no fechamento cabe no intervalo. A comparação usa o dia e as horas de São Paulo e a duração congelada do agendamento.
- Agendamentos que já começaram (`starts_at <= agora`), cancelados, concluídos ou com falta não impedem a mudança. A proteção não tem limite de 30 dias: vale também para os horários futuros marcados pela administração além da janela do cliente.
- A tela mantém os valores enviados e mostra o `message` da API num `Alert` `danger`, com a lista dos agendamentos: cada um é um link para `/admin/agenda/[id]` ("segunda-feira, 9 de novembro de 2026, 15:00 às 15:45 · Lauro · Ana") e, além dos 20, "E mais N agendamentos depois desses.". O cache da vitrine não é invalidado.

**CA-11 — Disputa entre mudança de expediente e reserva (RN-02, RN-05)**
- A proteção vale para criação e remarcação, tanto do cliente como da administração.
- Se uma reserva com início futuro está sendo confirmada primeiro, a alteração do expediente espera e recusa com `409 BUSINESS_HOURS_CONFLICT` quando o horário não couber.
- Se a alteração do expediente confirma primeiro, a reserva espera e consulta o expediente novo; se não couber, responde `409 SLOT_UNAVAILABLE`.
- Nenhuma das duas ordens pode confirmar os dois pedidos e deixar a reserva futura fora do expediente.

## Fluxo e telas
- **Layout de `/admin`:** antes de qualquer página da área, o layout verifica o acesso com `GET /admin/ping`, como a página `/admin` fazia na S2.09:
  - sem sessão, leva a `/entrar?voltar=/admin`;
  - cliente vai para `/`;
  - falha da API mostra um aviso.

  Para quem tem acesso, o layout mostra a navegação da área (Início, Cadastros). Itens sem tela (agenda, relatório) não aparecem.
- **`/admin`:** página inicial da área, com o atalho para os cadastros. A agenda do dia passa a ser a primeira tela quando existir.
- **`/admin/cadastros`:** lista dos cadastros disponíveis. Hoje é só "Barbearia"; barbeiros e serviços entram nas próximas issues.
- **`/admin/cadastros/barbearia`:** dois formulários independentes, cada um com seu botão "Salvar":
  1. **Dados da barbearia:** nome, frase de destaque, sobre, endereço, telefone, WhatsApp, Instagram e e-mail.
  2. **Horário de funcionamento:** um bloco por dia, com a situação (Aberto/Fechado), a abertura e o fechamento (`type="time"`). Quando o dia está fechado, os horários são ignorados.

  Os dois formulários funcionam sem JS: Server Action e campos nativos. Durante o envio, o botão fica em `pending`. Erros e sucesso aparecem em `Alert` no topo do formulário.

## API
| Método | Caminho | Quem | O que faz |
|---|---|---|---|
| `GET` | `/public/shop` | Qualquer um | Dados da barbearia e os 7 dias de funcionamento |
| `PUT` | `/admin/shop` | Administração | Substitui os dados da barbearia; devolve o mesmo formato do `GET` |
| `PUT` | `/admin/business-hours` | Administração | Substitui os 7 dias; recusa com `409 BUSINESS_HOURS_CONFLICT` (`BusinessHoursConflict`: `code`, `message`, `appointments`, `total`) se deixar agendamento futuro fora do expediente nos dias que mudam (RN-02) |

Horas trafegam como `HH:MM:SS` (o formato `time` do OpenAPI). Uma abertura nula significa dia fechado.

## Concorrência entre expediente e reservas (#105)
A criação e a remarcação chamam `ensure_slot_available`, que trava o dia da semana em `BusinessHours` com `FOR SHARE` até o commit, além da trava do barbeiro. A leitura com trava renova a linha mesmo se a sessão já tiver carregado o expediente. A edição trava os sete dias em ordem com `FOR UPDATE` antes de conferir os agendamentos futuros e só altera os dias depois dessa conferência.

Em `READ COMMITTED`, a consulta dos agendamentos feita depois da espera já vê a reserva confirmada; na ordem inversa, a reserva lê o expediente confirmado antes de calcular a disponibilidade. A edição não trava linhas de agendamento, evitando inverter a ordem das travas da remarcação. A trava do cliente na criação pelo site é `FOR NO KEY UPDATE`, para a reserva da administração para o mesmo cliente, que já segura o dia, não ficar esperando o cliente enquanto ele espera o dia travado pela edição; detalhes na [spec do agendamento](agendamento-cliente.md).

## Decisão sobre agendamentos futuros (#105)
Em 2026-11-01, o Vitor decidiu **impedir a mudança** enquanto houver agendamentos futuros fora do novo expediente (D13, [registro.md](../cliente/registro.md)). O sistema orienta a remarcar antes de salvar; não altera nem cancela agendamentos automaticamente. "Futuro" significa início estritamente depois de agora, não um atendimento que já começou.

## Decisão sobre a recusa (#124)
Em 2026-11-02, o Vitor decidiu que a recusa lista os agendamentos afetados e que só os dias que mudam são conferidos (D15, [registro.md](../cliente/registro.md)). A lista vai no próprio `409`, além de `code` e `message` (ADR 0008): `DomainError` ganhou `extra`, campos acrescentados ao corpo. Ela para em 20 (`CONFLICT_LIST_LIMIT`, `shop/service.py`) para a resposta não crescer com um dia fechado de vez; `total` conta todos.

## Fora do escopo desta spec
- A vitrine lendo esses dados, incluindo o rodapé que hoje tem o horário fixo: S3.05 (#54).
- Barbeiros e serviços: S3.03 (#52) e S3.04 (#53).
- O uso do horário no cálculo de disponibilidade: S3.07 (#56).
- Feriados e horários especiais por data. Hoje isso é uma folga de dia inteiro por barbeiro (RN-03, [bloqueios.md](bloqueios.md)).

## Dúvidas em aberto
- Endereço, telefone, WhatsApp, Instagram e e-mail reais da barbearia: o Vitor preenche pela tela de cadastro.
