# Registro do cliente

Log das conversas, fatos e decisões combinados com os proprietários da barbearia. É a fonte de origem de toda informação que veio do cliente: quando `visao.md`, `regras.md` ou uma spec afirma algo "porque o cliente pediu", a entrada correspondente está aqui.

## Como registrar

- **Só acrescente, não edite.** As entradas são cronológicas e as novas vão sempre no fim de [Entradas](#entradas). Se algo mudou, crie uma entrada nova dizendo o que mudou e citando a data da anterior.
- Uma entrada por conversa, no formato:

  ```markdown
  ### AAAA-MM-DD — Assunto curto
  - **Com:** quem participou
  - **Canal:** presencial | ligação | WhatsApp | reunião online
  - **Fatos e decisões:**
    - ...
  - **Pendências geradas:** (se houver, também vão para a tabela de pendências)
  ```

- Fatos são o que o cliente informou. Decisões são o que foi combinado. Não registre aqui opinião ou interpretação nossa.
- Contatos (telefone, e-mail) **não** entram neste arquivo.

## Proprietários

A barbearia é dividida por três barbeiros, que também são os proprietários. Eles foram os fornecedores de requisitos no projeto acadêmico de 2025:

- Edvaldo Conceição Santos
- Lauro Henrique de Jesus
- Manoel Santos Resende

Ainda não está definido quem é o ponto de contato principal nem quem tem o papel de administrador no sistema. Isso está na tabela de pendências.

## Pendências

Tabela viva: atualize o status quando resolver. A resolução também vira uma entrada no log.

| # | Pendência | Desde | Responsável | Status | Issue |
|---|---|---|---|---|---|
| P1 | Logo em vetor (SVG ou PDF) | 2025-09-16 | Proprietários | Aberta | #3, #9 |
| P2 | Paleta de cores oficial | 2025-09-16 | Proprietários | Aberta | #3, #9 |
| P3 | CNPJ: foi coletado em 2025, mas não está registrado em nenhum documento | 2025-09-16 | Vitor | Aberta | #3 |
| P4 | Padrão de pagamentos da barbearia: foi coletado em 2025, mas não está registrado | 2025-09-16 | Vitor | Aberta | #3 |
| P5 | Média de atendimentos semanais e mensais | 2025-09-16 | Vitor | Aberta | #3 |
| P6 | Acesso ao protótipo aprovado no Figma | 2026-10-08 | Vitor | Aberta | #3, #9 |
| P7 | Nome oficial: "Augusto" ou "Augustus" Barbearia | 2026-10-08 | Proprietários | Aberta | #3 |
| P8 | Quem é o ponto de contato principal e quem administra o sistema | 2026-10-08 | Proprietários | Aberta | #3 |

## Entradas

### 2025 (2º semestre, sem data exata) — Elicitação do projeto acadêmico
- **Com:** proprietários
- **Canal:** entrevistas e observação do processo de agendamento
- **Origem:** Documento de Visão do projeto acadêmico (TI3, PUC Minas, 2025/2)
- **Fatos e decisões:**
  - Os três barbeiros dividem o aluguel do ponto comercial.
  - Funcionamento: segunda a sexta das 10h às 19h, sábado das 9h às 14h.
  - O ponto tem estacionamento gratuito e fica perto de estabelecimentos de grande movimento.
  - Agendamentos e finanças são controlados à mão, numa agenda física.
  - O agendamento só acontece por telefone ou WhatsApp, sem centralização.
  - Problemas relatados: sobreposição de horários, falta de registros organizados e clientes que cancelam com pouco ou nenhum aviso.
  - A captação de novos clientes depende de indicação e da visibilidade física do ponto.

### 2025-09-16 — Apresentação dos wireframes
- **Com:** proprietários e a equipe do projeto acadêmico
- **Canal:** reunião online (Discord)
- **Origem:** Ata nº 2 do projeto acadêmico
- **Fatos e decisões:**
  - Os proprietários aprovaram o wireframe do sistema (protótipo no Figma).
  - A identidade visual vai usar a paleta de cores da logo.
  - Os proprietários deram sugestões de identidade visual. O conteúdo dessas sugestões não foi registrado na ata.
  - O CNPJ e o padrão de pagamentos foram coletados, mas não foram registrados (ver P3 e P4).
- **Pendências geradas:** P1, P2, P3, P4, P5

### 2025-11-11 — Demonstração da versão do site
- **Com:** a ata lista só os integrantes da equipe; não está claro se os proprietários participaram
- **Canal:** reunião online (Discord)
- **Origem:** Ata nº 6 do projeto acadêmico
- **Fatos e decisões:**
  - Foi demonstrada a versão do sistema daquele momento. Os pontos de melhoria levantados foram de usabilidade e responsividade.
  - As sugestões em si não foram registradas.

> As atas nº 1, 3, 4 e 5 do projeto acadêmico não estão no repositório antigo.

### 2026-10-08 — Retomada do projeto
- **Com:** registro interno (Vitor)
- **Canal:** —
- **Fatos e decisões:**
  - O sistema do projeto acadêmico de 2025 não foi entregue ao cliente.
  - Um novo sistema será construído do zero, desta vez para entrega real. Os documentos do projeto acadêmico servem apenas como material de referência.
- **Pendências geradas:** P6, P7, P8
