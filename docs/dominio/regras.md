# Regras de negócio

Este documento é a fonte de verdade do comportamento do sistema. Specs, issues, testes e código citam as regras pelo identificador (`RN-xx`).

**Como manter:**
- Mudou o comportamento → atualize a regra **no mesmo PR** do código.
- Não renumere nem reaproveite um identificador. Uma regra removida fica marcada como ~~removida~~, com o motivo.
- Toda regra diz de onde veio:
  - **D#**: decisão de produto registrada em [registro.md](../cliente/registro.md).
  - **2025**: material do projeto acadêmico, que foi feito entrevistando o cliente.
  - **Padrão adotado**: definido ao escrever esta documentação, sem pedido explícito. Pode ser revisto na apresentação do MVP.

Termos do domínio (Agendamento, Bloqueio, Atendimento…) estão definidos em [modelo.md](modelo.md).

---

## 1. Horários e disponibilidade

**RN-01 — Fuso horário.** Todas as datas e horas do sistema estão no fuso de São Paulo (`America/Sao_Paulo`). *Origem: padrão adotado.*

**RN-02 — Horário de funcionamento.** A administração configura o horário de funcionamento por dia da semana, como um intervalo de abertura e fechamento ou "fechado". O padrão inicial é segunda a sexta das 10h às 19h, sábado das 9h às 14h e domingo fechado. Todos os barbeiros seguem esse horário. A mudança é impedida se qualquer agendamento ativo (`SCHEDULED`) com início depois de agora ficar fora do novo intervalo de funcionamento do seu dia, considerando todo o intervalo do agendamento. Só contam os dias cujo horário muda: um agendamento que já estava fora do expediente impede a mudança do dia dele, não a de outros dias. A recusa lista os agendamentos afetados (data, hora, barbeiro e cliente), para a administração abrir cada um na agenda. A administração precisa remarcar ou cancelar esses agendamentos antes de alterar o expediente; nenhum dia é alterado parcialmente. Agendamentos que já começaram e os status finais não impedem a mudança. A garantia vale também com criação ou remarcação simultânea. *Origem: 2025 (elicitação); D13, D15.*

**RN-03 — Bloqueios.** A administração pode bloquear um intervalo na agenda de um barbeiro, com motivo opcional: almoço, folga, compromisso. Folga de dia inteiro é um bloqueio que cobre o dia todo. Um bloqueio só pode ser criado num intervalo sem agendamentos ativos. *Origem: 2025 (RF11, "bloquear horário"); D2.*

**RN-04 — Grade de horários.** Os horários de início oferecidos começam na abertura do dia e seguem de **30 em 30 minutos**. *Origem: D7.*

**RN-05 — Horário disponível.** Um horário de início `H` está disponível para o serviço `S` (de duração `d`) com o barbeiro `B` quando todas as condições abaixo valem:
1. `H` está na grade (RN-04);
2. o intervalo `[H, H + d)` cabe inteiro dentro do horário de funcionamento daquele dia (RN-02);
3. o intervalo não cruza nenhum bloqueio de `B` (RN-03);
4. o intervalo não cruza nenhum agendamento ativo de `B` (RN-08);
5. `B` realiza `S` (RN-61) e os dois estão ativos;
6. para o cliente, também valem a antecedência mínima e a janela máxima (RN-06, RN-07).

*Exemplo:* B tem um Corte + Barba (45 min) às 10h00, que ocupa até 10h45. O próximo início oferecido para B é 11h00, porque 10h30 cruza o atendimento das 10h00. *Origem: D7.*

**RN-06 — Antecedência mínima.** O cliente só agenda horários que comecem pelo menos **1 hora** depois do momento atual. *Origem: padrão adotado.*

**RN-07 — Janela de agendamento.** O cliente só agenda até **30 dias** à frente. *Origem: padrão adotado.*

**RN-08 — Sem sobreposição.** Nunca existem dois agendamentos ativos (status `AGENDADO`) que se cruzem no tempo para o mesmo barbeiro. A garantia vale **no servidor**, inclusive com concorrência: se duas pessoas tentam o mesmo horário ao mesmo tempo, só uma consegue, e a outra recebe "horário não está mais disponível". *Origem: 2025 (problema de sobreposição); objetivo O2.*

## 2. Agendamento pelo cliente

**RN-10 — Login para agendar.** Para agendar online, o cliente precisa entrar com a conta Google e ter **telefone** no perfil. O telefone é pedido no primeiro agendamento, se ainda não houver. *Origem: D3; o telefone é padrão adotado, para a barbearia conseguir contato.*

**RN-11 — Limite de agendamentos.** Um cliente pode ter no máximo **2 agendamentos ativos no futuro** ao mesmo tempo. *Origem: padrão adotado (evita reservas em excesso).*

**RN-12 — Confirmação imediata.** O agendamento feito pelo cliente nasce **confirmado** (status `AGENDADO`), sem aprovação manual. *Origem: padrão adotado. No projeto acadêmico havia um status "pendente" aprovado pelo barbeiro, mas o barbeiro não tem mais login (D2).*

**RN-13 — Preço e duração congelados.** O agendamento guarda o preço e a duração do serviço no momento em que foi criado. Mudar o cadastro do serviço depois não afeta agendamentos que já existem. *Origem: padrão adotado.*

**RN-14 — Prazo para cancelar e remarcar.** O cliente pode cancelar ou remarcar pelo site **até o início** do horário. As **2 horas antes** são a antecedência recomendada, não uma trava: nas últimas 2 horas (com o início ainda por vir), a alteração é **em cima da hora**, continua permitida e vem com um aviso que não esconde o custo de avisar tão tarde, com o contato da barbearia para quem só vai se atrasar. Exatamente 2 horas antes ainda está no prazo. A partir do início, o sistema não permite e mostra o contato da barbearia. Na remarcação, o horário novo continua exigindo a antecedência da RN-06. Não há taxa nem bloqueio por reincidência. *Origem: D6; 2025 (casos de uso); D16 (substitui a trava da D6, a confirmar com os proprietários).*

**RN-15 — Remarcação.** Remarcar muda a data, o horário e, se o cliente quiser, o barbeiro. O serviço não muda: para trocar de serviço, o cliente cancela e agenda de novo. O novo horário segue as mesmas regras de disponibilidade (RN-05). *Origem: padrão adotado.*

**RN-16 — Privacidade entre clientes.** O cliente só vê e altera os próprios agendamentos e os próprios dados. *Origem: padrão adotado (segurança e LGPD).*

## 3. Agendamento pela administração

**RN-20 — Cliente sem conta.** A administração pode agendar para um cliente já cadastrado ou cadastrar um cliente novo na hora, com **nome e telefone** obrigatórios e e-mail opcional. *Origem: D3; 2025 (RF12, RF13).*

**RN-21 — Regras que valem para a administração.** O agendamento pela administração segue RN-05, itens 1 a 5. **Não** se aplicam a antecedência mínima (RN-06), a janela (RN-07) nem o limite por cliente (RN-11). Isso permite registrar um "encaixe" que começa agora. O encaixe usa um horário da grade (RN-04), que pode já ter começado (às 14h10, o das 14h00, se o barbeiro estiver livre e o serviço couber no expediente); não existe horário fora da grade. *Origem: padrão adotado; o encaixe na grade foi decidido na S5.05 (#97).*

**RN-22 — Alterações pela administração.** A administração pode cancelar ou remarcar qualquer agendamento ativo a qualquer momento, sem o prazo do cliente (RN-14), inclusive depois do início. *Origem: D6 ("depois desse prazo, só a barbearia altera"); D16.*

**RN-23 — Vínculo de cadastro.** Se a administração cadastrou um cliente com e-mail, e depois alguém entra com uma conta Google desse mesmo e-mail, o login é vinculado a esse cadastro já existente, sem criar outro. *Origem: padrão adotado.*

## 4. Ciclo de vida do agendamento

**RN-30 — Status.** Um agendamento está sempre em um destes status:

| Status | Significado |
|---|---|
| `AGENDADO` | Horário reservado. É o único status considerado **ativo** |
| `CONCLUIDO` | O atendimento aconteceu e o pagamento foi registrado |
| `CANCELADO` | Foi cancelado pelo cliente ou pela administração |
| `FALTOU` | O cliente não compareceu |

**RN-31 — Transições permitidas.**

| De | Para | Quem | Condição |
|---|---|---|---|
| — | `AGENDADO` | Cliente ou administração | Horário disponível (RN-05) |
| `AGENDADO` | `AGENDADO` (remarcado) | Cliente (até 2h antes) ou administração | Novo horário disponível |
| `AGENDADO` | `CANCELADO` | Cliente (até 2h antes) ou administração | — |
| `AGENDADO` | `CONCLUIDO` | Administração | O horário de início já chegou; registra o pagamento (RN-40) |
| `AGENDADO` | `FALTOU` | Administração | O horário de início já chegou |

`CONCLUIDO`, `CANCELADO` e `FALTOU` são status **finais**. *Origem: 2025 (documentos de interface do RF02 e RF04, adaptados); D2; D8.*

**RN-32 — Liberação da vaga.** Quando um agendamento sai de `AGENDADO`, o horário dele volta a ficar disponível na hora. *Origem: padrão adotado.*

**RN-33 — Rastreabilidade.** O sistema registra quem cancelou (cliente ou administração) e quando, e quem concluiu ou marcou falta. *Origem: padrão adotado.*

## 5. Financeiro

**RN-40 — Conclusão com pagamento.** Concluir um atendimento exige:
- o **valor cobrado**, maior ou igual a zero. O campo já vem preenchido com o preço do agendamento (RN-13) e pode ser alterado (desconto, cortesia);
- a **forma de pagamento**: `DINHEIRO`, `PIX`, `DEBITO` ou `CREDITO`.

*Origem: D8.*

**RN-41 — Correção.** A administração pode corrigir o valor e a forma de pagamento de um atendimento concluído. O status não volta atrás. *Origem: padrão adotado.*

**RN-42 — Faturamento por barbeiro.** O valor de um atendimento conta para o barbeiro do agendamento. *Origem: 2025 (RF16, "faturamento por barbeiro").*

**RN-43 — Relatório financeiro.** O relatório recebe um **período obrigatório** (data inicial ≤ data final) e um filtro **opcional por barbeiro**. Ele mostra:
- o faturamento total e a quantidade de atendimentos concluídos;
- os totais por barbeiro e por forma de pagamento;
- a quantidade de faltas no período;
- a lista detalhada dos atendimentos concluídos.

*Origem: 2025 (documento de interface do RF16); D8.*

**RN-44 — Atendimento sem agendamento prévio.** O cliente que chega e é atendido na hora é registrado como um agendamento feito pela administração começando agora (RN-21) e depois concluído normalmente. Todo valor do financeiro vem de um atendimento concluído. Não existe lançamento avulso. *Origem: padrão adotado.*

## 6. Notificações (e-mail)

**RN-50 — Confirmação.** Quando um agendamento é criado, o cliente recebe um e-mail de confirmação, se tiver e-mail cadastrado. Quando a administração agenda um horário que já começou (o encaixe, ou o registro de um atendimento que já aconteceu), não há e-mail. *Origem: D4; 2025 (RF03); o caso do horário que já começou é decisão do proprietário, na S5.09.*

**RN-51 — Lembrete.** O cliente recebe um lembrete por e-mail cerca de **24 horas antes** do início. Se o agendamento foi criado com menos de 24h de antecedência, não há lembrete: a confirmação já cumpre esse papel. O mesmo vale para o horário remarcado: a remarcação com menos de 24h de antecedência não gera lembrete, e um lembrete já enviado para o horário antigo não impede o do novo. *Origem: D4; os 24h são padrão adotado; o caso do remarcado é padrão adotado, a confirmar.*

**RN-52 — Alterações.** Remarcação e cancelamento, feitos por qualquer lado, geram e-mail ao cliente com o novo estado do agendamento (o cancelamento feito pela barbearia diz que foi ela). Cancelar, ou remarcar para um horário que já começou, pela administração não gera e-mail: não há o que avisar. *Origem: D4; 2025 (sistema de e-mails do projeto acadêmico); o caso do horário que já começou é decisão do proprietário, na S5.09.*

**RN-53 — Conteúdo.** Todo e-mail traz o serviço, o barbeiro, a data e a hora, o endereço, um link para "Meus agendamentos" e o contato da barbearia. O texto sobre alterar acompanha o momento do envio (RN-14): antes das 2 horas, a política ("até o horário marcado; se puder, avise com pelo menos 2 horas de antecedência"); nas últimas 2 horas, o convite a avisar ("Imprevisto? Você ainda pode remarcar ou cancelar pelo site até o horário marcado."); depois do início, falar com a barbearia. O cancelamento feito pelo cliente em cima da hora agradece o aviso. *Origem: padrão adotado; o aviso do prazo é decisão do proprietário, na S5.09; D16.*

**RN-54 — Falha de envio.** Se um e-mail falhar, o agendamento **não** é desfeito. A falha fica registrada para diagnóstico. *Origem: padrão adotado.*

## 7. Cadastros

**RN-60 — Barbeiro.** Tem nome, foto, apresentação (até 400 caracteres) e uma situação ativo/inativo. O barbeiro inativo some da vitrine e não recebe agendamentos novos. Um barbeiro só pode ser inativado se não tiver agendamentos ativos no futuro. *Origem: 2025 (RF05, RF14); D2.*

**RN-61 — Serviço.** Tem nome, descrição opcional, preço (≥ 0), duração (múltiplo de 5 minutos, no mínimo 10 minutos), a lista de barbeiros que o realizam (pelo menos um) e uma situação ativo/inativo. Um serviço com histórico de agendamentos não é excluído, só inativado. O serviço inativo some da vitrine e não recebe agendamentos novos. *Origem: 2025 (RF06, documentação de serviços); a inativação no lugar da exclusão é padrão adotado.*

**RN-62 — Cliente.** Tem nome e telefone obrigatórios e e-mail, que é obrigatório quando o cadastro veio do Google. *Origem: D3; 2025 (RF12).*

**RN-63 — Dados iniciais.** Até a apresentação do MVP, o sistema usa os serviços do projeto acadêmico, **Corte Simples** (30 min, R$ 25,00) e **Corte + Barba** (45 min, R$ 35,00), e os três barbeiros proprietários. Os preços reais são a pendência P9. *Origem: 2025 (dados do projeto acadêmico).*

## 8. Acesso

**RN-70 — Perfis e permissões.**

| Ação | Visitante | Cliente | Administração |
|---|:-:|:-:|:-:|
| Ver a vitrine (serviços, barbeiros, informações) | ✅ | ✅ | ✅ |
| Agendar para si | — | ✅ | — |
| Ver, remarcar e cancelar os próprios agendamentos | — | ✅ (RN-14) | — |
| Ver e alterar a agenda de todos os barbeiros | — | — | ✅ |
| Agendar para qualquer cliente | — | — | ✅ |
| Concluir atendimento e marcar falta | — | — | ✅ |
| Cadastros (barbeiros, serviços, horários, clientes) | — | — | ✅ |
| Relatório financeiro | — | — | ✅ |

**RN-71 — Acesso à administração.** Só entram na administração as contas Google que estão numa **lista de e-mails autorizados**. Qualquer outra conta Google é tratada como cliente. *Origem: D2, D3; o mecanismo da lista é padrão adotado.*

**RN-72 — LGPD.** O site tem uma página de política de privacidade. Os dados do cliente são usados só para o atendimento. O cliente pode pedir a exclusão dos dados pelo contato da barbearia. Os atendimentos concluídos continuam no histórico financeiro, sem os dados pessoais. *Origem: padrão adotado (exigência legal).*
