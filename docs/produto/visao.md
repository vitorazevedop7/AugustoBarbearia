# Visão do produto — Augusto Barbearia

> **Como as decisões são tomadas:** o MVP vai ser construído e apresentado pronto aos proprietários. Até essa apresentação, as decisões de produto são tomadas por Vitor (product owner) em nome do cliente e registradas em [registro.md](../cliente/registro.md). O feedback da apresentação pode mudar este documento.

## Problema

A barbearia controla agendamentos e finanças à mão, numa agenda física. O agendamento só chega por telefone ou WhatsApp e não fica centralizado em lugar nenhum. Isso causa:

- **sobreposição de horários** entre atendimentos;
- **cancelamentos e faltas** com pouco ou nenhum aviso, que deixam buracos na agenda dos barbeiros;
- **nenhum registro organizado** de atendimentos e de faturamento;
- **pouca captação de clientes novos**, porque a barbearia depende de indicação e da visibilidade física do ponto.

Origem: elicitação do projeto acadêmico de 2025 (ver [registro.md](../cliente/registro.md)).

## Contexto do negócio

- São **três barbeiros** que dividem o aluguel do ponto. Cada um tem a própria agenda.
- **Funcionamento:** segunda a sexta das 10h às 19h, sábado das 9h às 14h.
- O ponto tem estacionamento gratuito e fica perto de estabelecimentos de grande movimento.
- Os serviços são os tradicionais de barbearia, com preço e duração definidos por serviço.

## Usuários

O sistema tem **dois lados**: o do cliente e o da administração.

| Perfil | Quem é | O que faz no sistema |
|---|---|---|
| **Visitante** | Qualquer pessoa que acessa o site | Vê a barbearia, os serviços, os preços, os barbeiros e a localização |
| **Cliente** | Quem agenda atendimentos. Entra com a **conta Google** | Agenda, remarca e cancela os próprios horários; recebe confirmação e lembrete por e-mail |
| **Administração** | A equipe da barbearia, com contas Google autorizadas | Cuida da agenda de todos os barbeiros, faz agendamentos por telefone ou balcão, conclui atendimentos registrando o pagamento, faz os cadastros e vê os relatórios |

**O barbeiro não é um usuário.** Ele é um *profissional cadastrado*: tem nome, foto, apresentação, serviços que realiza e uma agenda própria, mas não faz login. Tudo o que envolve a agenda dele é feito pelo lado da administração.

O **cliente sem conta Google** também é atendido: quem liga ou chega no balcão é cadastrado pela administração, só com nome e telefone.

## Objetivos

| # | Objetivo | Como medir |
|---|---|---|
| O1 | Substituir a agenda física: todo agendamento em um lugar só | Percentual dos atendimentos registrados no sistema |
| O2 | Acabar com a sobreposição de horários | Conflitos de horário por mês (meta: zero; o sistema impede) |
| O3 | Reduzir faltas e cancelamentos de última hora | Faltas por mês, registradas no sistema |
| O4 | Dar visibilidade do faturamento | Faturamento por período, por barbeiro e por forma de pagamento sem fazer conta à mão |
| O5 | Ter presença digital para atrair clientes novos | Agendamentos online feitos por clientes novos |

## Escopo do produto

Estas são as capacidades que o sistema deve ter ao longo do tempo. **O que entra no MVP e o que fica para depois** está no [roadmap.md](roadmap.md).

- **Vitrine pública:** informações da barbearia, serviços e preços, barbeiros e localização.
- **Agendamento online:** o cliente escolhe serviço, barbeiro e um horário livre; depois pode remarcar e cancelar.
- **Agenda por barbeiro:** horário de funcionamento, bloqueios e folgas, sem sobreposição de atendimentos.
- **Agendamento pela administração:** para clientes que ligam ou chegam pessoalmente.
- **Notificações:** confirmação, lembrete e cancelamento por e-mail; WhatsApp numa fase posterior.
- **Cadastros:** barbeiros, serviços (preço e duração) e clientes.
- **Financeiro simples:** o atendimento concluído registra o valor cobrado e a forma de pagamento; há relatório por período, barbeiro e forma de pagamento.
- **Programa de fidelidade** (fase posterior): pontos por atendimento, trocados por benefícios.

## Fora do escopo

- **Pagamento online** (cartão, Pix, gateways). O sistema só *registra* o pagamento feito no balcão.
- **Relatórios financeiros avançados** (projeções, integração com a contabilidade).
- **Aplicativo nativo** (Android/iOS). O sistema é web responsivo.
- **Chat em tempo real** ou suporte dentro da plataforma.
- **Integração com redes sociais** (agendar direto pelo Instagram ou Facebook).
- **Login do barbeiro** e área própria para ele.

## Restrições e requisitos de qualidade

- **Mobile first:** a maioria dos clientes vai usar pelo celular. O layout precisa ser responsivo e funcionar nos navegadores atuais.
- **Operação simples:** a equipe da barbearia não é técnica. O dia a dia (ver a agenda, marcar, concluir um atendimento) precisa ser possível em poucos toques no celular.
- **Custo baixo de operação:** até a apresentação do MVP, **nada é pago**. A demonstração roda no notebook do Vitor, aberta pelo celular por um link público gratuito (D9, [ADR 0010](../decisoes/0010-demonstracao-local-com-tunel.md)). Se os proprietários quiserem o sistema, a hospedagem definitiva é paga pela barbearia, e a preferência é por planos baratos.
- **Dados pessoais:** o sistema guarda nome, e-mail e telefone de clientes, então precisa atender à LGPD (política de privacidade e uso dos dados só para o atendimento).
- **Segurança:** a área de administração só é acessível por contas autorizadas, e os dados de um cliente só são visíveis para ele e para a administração.
- **Desempenho:** a agenda deve carregar em menos de 3 segundos.

## Referências

- Documento de Visão, documentos de interface e e-book do projeto acadêmico (TI3, PUC Minas, 2025/2), no repositório antigo `AugustoBarbearia_Vitor`.
- [docs/cliente/registro.md](../cliente/registro.md): origem dos fatos e das decisões.
