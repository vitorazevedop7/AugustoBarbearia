# Visão do produto

> **Status:** rascunho. Ainda precisa ser validado com os proprietários (#3). Os itens marcados com ⚠️ dependem dessa validação.
> **Nome:** este documento usa "Augustus Barbearia". O nome oficial ainda precisa ser confirmado (pendência P7 em [registro.md](../cliente/registro.md)).

## Problema

A barbearia controla agendamentos e finanças à mão, numa agenda física. O agendamento só chega por telefone ou WhatsApp e não fica centralizado em lugar nenhum. Isso causa:

- **sobreposição de horários** entre atendimentos;
- **cancelamentos e faltas** com pouco ou nenhum aviso, que deixam buracos na agenda dos barbeiros;
- **nenhum registro organizado** de atendimentos e de faturamento;
- **pouca captação de clientes novos**, porque a barbearia depende de indicação e da visibilidade física do ponto.

Origem: [registro.md](../cliente/registro.md), entrada da elicitação de 2025.

## Contexto do negócio

- São **três barbeiros que dividem o aluguel do ponto**. Cada um tem a própria agenda e os próprios clientes. ⚠️ Ainda não sabemos se existe um dono ou administrador único, nem se o faturamento é separado por barbeiro (P8).
- **Funcionamento:** segunda a sexta das 10h às 19h, sábado das 9h às 14h. ⚠️ Confirmar se continua assim.
- O ponto tem estacionamento gratuito e fica perto de estabelecimentos de grande movimento.
- Os serviços são os tradicionais de barbearia. ⚠️ A lista, os preços e a duração de cada serviço precisam ser levantados.

## Usuários

| Perfil | Quem é | O que precisa |
|---|---|---|
| **Visitante** | Qualquer pessoa que acessa o site | Conhecer a barbearia, os serviços, os preços, os barbeiros e a localização |
| **Cliente** | Quem agenda atendimentos | Agendar, remarcar ou cancelar sem precisar ligar; receber confirmação e lembrete |
| **Barbeiro** | Os três profissionais | Ver a própria agenda, controlar a disponibilidade, agendar clientes que ligam ou chegam pessoalmente e registrar o atendimento concluído |
| **Administrador** | ⚠️ A definir: um dos barbeiros, todos eles ou nenhum (P8) | Cadastrar barbeiros e serviços, definir preços e ver relatórios de faturamento |

⚠️ O cliente precisa criar uma conta para agendar, ou basta informar nome e telefone? Isso muda bastante a experiência de agendamento.

## Objetivos

| # | Objetivo | Como medir |
|---|---|---|
| O1 | Substituir a agenda física: todo agendamento em um lugar só | Percentual dos atendimentos que passam pelo sistema |
| O2 | Acabar com a sobreposição de horários | Conflitos de horário por mês (meta: zero) |
| O3 | Reduzir faltas e cancelamentos de última hora | Faltas por mês, comparadas com a situação atual ⚠️ |
| O4 | Dar visibilidade do faturamento | Os proprietários conseguem consultar o faturamento do período sem fazer conta à mão |
| O5 | Ter presença digital para atrair clientes novos | Agendamentos feitos por clientes que não eram da casa |

⚠️ Para comparar O1 e O3 com a situação atual, precisamos da média de atendimentos e de faltas de hoje (P5).

## Escopo

Estas são as capacidades que o sistema deve ter. **O que entra no lançamento e o que fica para depois** é decidido no `roadmap.md` (#4).

- **Vitrine pública:** informações da barbearia, serviços e preços, barbeiros e localização.
- **Agendamento online pelo cliente:** escolher serviço, barbeiro e horário livre; remarcar e cancelar.
- **Agenda por barbeiro:** cada barbeiro tem a própria agenda e controla a própria disponibilidade (bloquear horários, folgas).
- **Agendamento pelo barbeiro:** registrar os clientes que marcam por telefone ou pessoalmente.
- **Notificações:** confirmação e lembrete do agendamento. ⚠️ O canal (WhatsApp ou e-mail) ainda não foi definido.
- **Cadastros:** barbeiros e serviços, com preço e duração.
- **Registro financeiro simples:** o atendimento concluído vira uma entrada de faturamento, e há um relatório por período e por barbeiro.
- **Programa de fidelidade:** pontos por atendimento, trocados por benefícios. ⚠️ No projeto acadêmico ocupava 4 dos 18 requisitos. Precisamos confirmar se é prioridade.

## Fora do escopo

Herdado do projeto acadêmico. ⚠️ Revalidar com os proprietários.

- **Pagamento online** (cartão, Pix, gateways). O sistema só *registra* o pagamento feito no balcão.
- **Relatórios financeiros avançados** (projeções, integração com a contabilidade).
- **Aplicativo nativo** (Android/iOS). O sistema é web responsivo.
- **Chat em tempo real** ou suporte dentro da plataforma.
- **Integração com redes sociais** (agendar direto pelo Instagram ou Facebook).

## Restrições e requisitos de qualidade

- **Mobile first:** a maioria dos clientes vai usar pelo celular. O layout precisa ser responsivo e funcionar nos navegadores atuais.
- **Operação simples:** os barbeiros não são técnicos. O dia a dia (ver a agenda, marcar, concluir um atendimento) precisa ser possível em poucos toques.
- **Custo baixo de operação:** ⚠️ ainda falta definir quem paga a hospedagem e o domínio, e qual é o orçamento mensal.
- **Dados pessoais:** o sistema guarda nome e telefone de clientes, então precisa atender à LGPD (aviso de privacidade e uso dos dados só para o atendimento).
- **Segurança:** senhas armazenadas com hash e acesso restrito por perfil.
- **Desempenho:** a agenda deve carregar em menos de 3 segundos (requisito do projeto acadêmico).

## Pontos a validar com o cliente

São a entrada do roteiro da #3. Os códigos P* são das pendências em [registro.md](../cliente/registro.md).

1. Nome oficial: Augusto ou Augustus? (P7)
2. Quem administra o sistema? O faturamento é separado por barbeiro? Cada um vê só o seu? (P8)
3. O cliente precisa de conta, ou agenda só com nome e telefone?
4. Canal de notificação: WhatsApp ou e-mail? Lembrete com quanto tempo de antecedência?
5. Regras de cancelamento e remarcação: a regra das 2h de antecedência continua valendo? O que fazer com quem falta?
6. Lista de serviços com preço e duração; intervalo da grade de horários.
7. O horário de funcionamento continua o mesmo? Cada barbeiro tem horário próprio?
8. Formas de pagamento a registrar (P4).
9. O programa de fidelidade é prioridade para o lançamento?
10. O fora do escopo continua valendo?
11. Média atual de atendimentos e de faltas (P5).
12. Materiais: logo em vetor, paleta e acesso ao Figma (P1, P2, P6).
13. Hospedagem e domínio: quem paga e qual o orçamento.

## Referências

- Documento de Visão e e-book do projeto acadêmico (TI3, PUC Minas, 2025/2), no repositório antigo `AugustoBarbearia_Vitor`.
- [docs/cliente/registro.md](../cliente/registro.md)
