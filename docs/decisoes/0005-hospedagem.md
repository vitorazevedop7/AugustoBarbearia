# 0005 — Hospedagem na Railway

- **Status:** aceito
- **Data:** 2026-10-08

## Contexto
O sistema vai ser entregue a um negócio real e, até a apresentação, o custo é do Vitor (ver `visao.md`). São necessários: dois serviços em containers, PostgreSQL e uma tarefa agendada para os lembretes (RN-51). Planos gratuitos que proíbem uso comercial (como o Vercel Hobby) não servem para a entrega.

## Decisão
**Railway**, num projeto com:

| Serviço Railway | O que roda |
|---|---|
| `web` | Imagem do Next.js. É o único serviço com domínio público |
| `api` | Imagem do FastAPI, acessível pelo `web` pela rede privada da Railway |
| `postgres` | PostgreSQL gerenciado |
| `jobs` | A mesma imagem da `api`, com o comando dos lembretes, agendada por cron (de hora em hora) |

- **Deploy automático** a cada push na `main`.
- O custo esperado é o plano Hobby (US$ 5/mês com US$ 5 de uso incluso) mais o consumo excedente, estimado entre US$ 5 e 10 por mês no total.

## Alternativas consideradas
- **Vercel + Neon:** grátis até a entrega, mas o Hobby proíbe uso comercial, não roda a API Python como serviço contínuo e exigiria outra hospedagem para ela.
- **VPS com Coolify:** a mais barata (cerca de €5/mês), mas backup, atualizações e uptime ficam por conta do Vitor.
- **Render ou Fly.io:** equivalentes. A Railway ganhou pela simplicidade de ter app, banco e cron no mesmo projeto.

## Consequências
- Não há plano gratuito permanente: o custo começa no primeiro deploy.
- O domínio próprio e a passagem das contas para a barbearia ficam para a Fase 2 (`roadmap.md`).
- A configuração da Railway (serviços, variáveis, cron) precisa ficar documentada em `arquitetura.md`, porque não está no código.
