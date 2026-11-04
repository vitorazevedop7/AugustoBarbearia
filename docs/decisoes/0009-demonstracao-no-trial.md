# 0009 — Demonstração no trial da Railway e custo da barbearia após a aprovação

- **Status:** substituído por [0010](0010-demonstracao-local-com-tunel.md)
- **Data:** 2026-10-28

## Contexto
O [0005](0005-hospedagem.md) escolheu a Railway com o plano Hobby e partia de que, até a apresentação, o custo seria do Vitor. Essa premissa mudou (D9 em `registro.md`): **até a apresentação nada é pago**. Se os proprietários quiserem o sistema, a hospedagem definitiva passa a ser paga pela barbearia.

Mesmo assim, a apresentação precisa de um site **no ar**: um link de verdade, que os proprietários abram no próprio celular, passa mais seriedade que uma demonstração no notebook.

A Railway não tem plano gratuito que sustente o sistema por meses. Em outubro de 2026, a conta nova tinha:
- um **trial de 30 dias, contados do cadastro**, com US$ 5 de crédito, até 5 serviços por projeto e sem cartão (a conta é verificada pelo GitHub);
- depois do trial, o plano Free, com US$ 1 de crédito por mês, que não mantém web, api e Postgres no ar;
- volumes do trial (o banco) apagados 30 dias depois do fim do crédito, a não ser que a conta assine um plano antes. Assinando, os dados ficam.

## Decisão
**A demonstração roda no trial gratuito da Railway**, no mesmo formato descrito no 0005 (`web`, `api`, `postgres` e, se já existir, `jobs`). A Railway continua sendo a hospedagem definitiva.

- **Até perto da apresentação:** não existe ambiente na internet. Todo o desenvolvimento roda no `docker compose`, com as mesmas imagens que vão para a Railway ([0004](0004-docker.md)).
- **Cerca de uma semana antes da apresentação:** o Vitor cria a conta na Railway e é feito o deploy de demonstração, com dados de exemplo e um cliente OAuth do Google para o domínio `*.up.railway.app`. A conta não é criada antes para que os 30 dias do trial cubram a apresentação e o período de decisão dos proprietários.
- **Se os proprietários aprovarem:** a barbearia assina o Hobby no mesmo projeto, com o meio de pagamento dela, e a demonstração vira produção sem migração. A passagem das contas e o domínio próprio seguem na Fase 2 (`roadmap.md`).
- **Se não aprovarem:** o trial expira e nada é cobrado.

## Alternativas consideradas
- **Assinar o Hobby agora (0005 como estava):** cumpre o plano original, mas cobra todo mês por um ambiente que ninguém usa até a apresentação.
- **Hospedagem de demonstração em outra plataforma gratuita (por exemplo, Render + Neon):** não tem prazo, mas os serviços gratuitos "dormem" sem uso e levam perto de um minuto para acordar, o que é ruim na frente dos proprietários. Além disso, o deploy seria montado duas vezes: uma para a demonstração e outra para a produção. Fica como plano B se a avaliação dos proprietários passar de 30 dias.
- **Demonstrar só pelo notebook (`localhost`):** custo zero e sem prazo, mas os proprietários não testam no próprio celular, e isso enfraquece a apresentação.

## Consequências
- Custo zero até a decisão dos proprietários, e nenhuma migração se eles aprovarem.
- A Fase 0 não tem mais deploy contínuo: os problemas de produção só aparecem no deploy de demonstração. O risco é reduzido porque o compose usa as mesmas imagens, e o deploy é feito com uma semana de folga.
- O prazo do trial é curto. A data da apresentação precisa estar marcada antes de a conta ser criada.
- O app OAuth do Google está "em teste", e só os usuários de teste entram. Antes da demonstração é preciso publicar o app ou incluir as contas Google dos proprietários como usuários de teste.
- Os limites do trial e dos planos gratuitos mudam com o tempo. Eles devem ser conferidos de novo quando a conta for criada.
- O 0005 continua valendo para a hospedagem definitiva. Este ADR substitui só a premissa de custo dele: o "o custo começa no primeiro deploy" passa a valer a partir da assinatura feita pela barbearia.
