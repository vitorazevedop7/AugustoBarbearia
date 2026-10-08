# 0006 — E-mail com Resend e lembretes por tarefa agendada

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
As notificações do MVP saem por e-mail (D4): confirmação, lembrete cerca de 24h antes, remarcação e cancelamento (RN-50 a RN-54). Uma falha de envio não pode desfazer o agendamento (RN-54). O lembrete depende do tempo, não de uma ação do usuário.

## Decisão
- **Provedor: Resend**, pelo SDK Python, chamado pela API. Os templates de e-mail ficam no código da API.
- **E-mails disparados por ações** (confirmação, remarcação, cancelamento): a API grava um registro `Notification` **na mesma transação** da ação e envia depois do commit. Se o envio falhar, o registro fica com status de falha (RN-54).
- **Lembretes:** um comando da API (`python -m app.jobs.send_reminders`) roda **de hora em hora** pelo serviço `jobs` ([0005](0005-hospedagem.md)). Ele envia o lembrete dos agendamentos `SCHEDULED` que começam entre 23h e 25h à frente e que ainda não têm lembrete registrado. Essa marcação deixa o job **idempotente**: rodar duas vezes não manda dois e-mails.
- O remetente usa um domínio verificado no Resend. Até existir o domínio da barbearia, usa-se um domínio do Vitor ou o de testes do Resend.

## Alternativas consideradas
- **SMTP do Gmail (Nodemailer no projeto acadêmico):** limites baixos, entregabilidade ruim e credenciais pessoais no servidor.
- **Fila com Celery/Redis:** robusto, mas pesado demais para o volume de uma barbearia.
- **Agendar cada lembrete no momento do agendamento:** precisaria de um agendador persistente; o job de hora em hora é mais simples e resiliente.

## Consequências
- O plano gratuito do Resend (100 e-mails por dia, 3.000 por mês) cobre com folga o volume esperado.
- O lembrete pode chegar até cerca de 1h fora das 24h exatas. É aceitável.
- Quando o WhatsApp entrar (Fase 2), a tabela `Notification` ganha um canal e o mesmo fluxo é reaproveitado.
