# Spec — Política de privacidade

- **Issue:** #50 (S3.01)
- **Fase:** 1 (MVP) (ver [roadmap](../produto/roadmap.md))
- **Status:** implementada

## Contexto
O sistema guarda nome, e-mail e telefone de clientes, então precisa atender à LGPD ([visão](../produto/visao.md#restrições-e-requisitos-de-qualidade)). A RN-72 pede uma página que explique, em linguagem simples, quais dados a barbearia guarda, para que servem e como pedir a exclusão. A página é estática e pública: o visitante lê antes de entrar com o Google.

## Quem usa
Visitante e cliente (a página não exige login).

## Histórias
- Como **visitante**, quero saber quais dados meus a barbearia vai guardar antes de entrar com o Google.
- Como **cliente**, quero saber quem vê os meus dados e como pedir a exclusão deles.

## Regras envolvidas
- RN-72 — LGPD (a página, o uso só para o atendimento, a exclusão pelo contato e o histórico financeiro sem dados pessoais)
- RN-16 — Privacidade entre clientes (quem vê os dados)
- RN-10, RN-20 e RN-62 — de onde vêm nome, telefone e e-mail
- RN-50 a RN-53 — os e-mails transacionais (confirmação, lembrete e alterações)
- RN-40 — o que a conclusão registra (valor e forma de pagamento)

## Conteúdo
O texto segue o tom da [identidade visual](../design/identidade-visual.md#tom): "você", frases curtas, sem juridiquês. Ele **descreve só o que o sistema faz** (ou o que as RNs do MVP definem) e não promete prazo, processo automático ou direito que o sistema não cumpre.

| Seção | O que diz | Base |
|---|---|---|
| Em resumo | Três frases: os dados e o uso só para o atendimento; quem vê; como pedir a exclusão | RN-72, RN-16 |
| Quais dados guardamos | Nome, e-mail e telefone; os agendamentos (serviço, barbeiro, data e hora, situação) e, na conclusão, o valor e a forma de pagamento. Quem marca por telefone ou no balcão é cadastrado com nome e telefone, e o e-mail é opcional | RN-10, RN-20, RN-40, RN-62 |
| Para que usamos | Só para o atendimento: agendar, confirmar, lembrar, remarcar e cancelar, e a barbearia falar com você sobre um horário. Não vendemos os dados nem enviamos propaganda | RN-72 |
| Entrar com o Google | Do Google vêm só nome, e-mail e foto do perfil; nada de senha nem outros dados da conta. Os cookies servem só para o login e a sessão | [login-google](login-google.md) |
| E-mails que você recebe | Confirmação, lembrete cerca de 24h antes e aviso de remarcação ou cancelamento, só para quem tem e-mail cadastrado. Nada de propaganda | RN-50 a RN-53 |
| Quem vê seus dados | Você vê só os seus; outros clientes não veem. A equipe da barbearia vê para cuidar da agenda. Os serviços que fazem o site funcionar (login do Google, envio de e-mails e hospedagem) | RN-16, [arquitetura](../arquitetura.md) |
| Como pedir a exclusão | Pelo contato da barbearia ou no balcão, direto com a equipe; não há opção no site | RN-72 |
| O que fica no histórico | Os atendimentos concluídos ficam no histórico financeiro só com serviço, barbeiro, data, valor e forma de pagamento, sem nome, e-mail ou telefone | RN-72 |

Ainda não há contato da barbearia no código: a página diz "pelo contato da barbearia" em vez de inventar telefone ou e-mail. Os dados reais chegam com a #51 (S3.02).

## Critérios de aceite

**CA-1 — Página pública**
- **Dado** um visitante sem login
- **Quando** abre `/privacidade`
- **Então** vê o título "Política de privacidade" (`h1`) e as seções da tabela acima, cada uma com o seu `h2`.

**CA-2 — Conteúdo obrigatório**
- **Dado** a página aberta
- **Quando** o visitante lê o texto
- **Então** encontra os dados guardados (nome, e-mail e telefone), o uso só para o atendimento, o que vem do Google, os e-mails transacionais, quem vê os dados, como pedir a exclusão pelo contato da barbearia e o que fica no histórico financeiro sem dados pessoais.

**CA-3 — Links**
- **Dado** qualquer página com o rodapé, ou a tela `/entrar`
- **Quando** o visitante procura a política
- **Então** encontra o link "Política de privacidade" para `/privacidade`.

**CA-4 — Celular**
- **Dado** uma tela de 360px
- **Quando** a página abre
- **Então** o texto cabe sem rolagem horizontal e segue o [checklist de acessibilidade](../design/design-system.md#acessibilidade-checklist-de-cada-tela).

## Fluxo e telas
- **`/privacidade`** (grupo `(publico)`, Server Component estático): fundo `paper`, ornamento e título em Libre Caslon Text (`text-display-2`; Barlow 900 em caixa alta da S4.03 até a #196, Playfair antes), texto de abertura e a data da última atualização. Logo abaixo, um card `surface` "Em resumo". Depois, as seções em texto corrido até `max-w-2xl`, com títulos `text-display-3`, separadas por `line`.
- **Rodapé:** na faixa de baixo, ao lado do "©", o link "Política de privacidade".
- **`/entrar`:** na frase sobre os dados do Google, o link "Política de privacidade".
- Sem estados de carregando, vazio ou erro: a página não busca dados.

## API
Nenhuma.

## Fora do escopo desta spec
- O fluxo de exclusão dentro do sistema: o pedido continua manual, pelo contato (RN-72).
- A ferramenta da administração para tirar os dados pessoais de um cliente e manter o histórico financeiro (RN-72). Ela ainda não tem issue.
- Mostrar o telefone e o e-mail reais da barbearia na página. Depende da #51 (`GET /public/shop`).
- Banner de cookies: o site só usa cookies necessários para o login.

## Dúvidas em aberto
- Quando a #51 estiver na `main`, trocar "pelo contato da barbearia" pelo contato real lido da API.
- A política não nomeia o responsável pelos dados (razão social, CNPJ) nem um encarregado (DPO). Os proprietários precisam confirmar esses dados antes da produção.
