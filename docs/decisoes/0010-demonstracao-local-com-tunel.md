# 0010 — Demonstração no notebook com link público

- **Status:** aceito
- **Data:** 2026-11-04

## Contexto
O [0009](0009-demonstracao-no-trial.md) colocava a demonstração no trial gratuito da Railway, que viraria produção se os proprietários aprovassem. Na hora de executar (#32), a premissa caiu:

- a conta da Railway do Vitor já usou o trial, e uma conta nova só para ganhar outro trial contraria a verificação da Railway contra contas múltiplas;
- o plano Free (novembro de 2026) aceita 1 projeto e 3 serviços, e o sistema usa 4 (`Postgres`, `api`, `web` e `jobs`); o crédito de US$ 1 por mês mantém `web`, `api` e `Postgres` no ar por cerca de 7 a 10 dias;
- assinar o Hobby antes da apresentação contraria a D9 (nada é pago até a apresentação).

O que a apresentação precisa é que os proprietários vejam o sistema real, com a identidade visual, **no próprio celular**. Não é preciso que ele fique no ar por semanas antes do aceite.

## Decisão
**A demonstração roda no notebook do Vitor, com as imagens de produção, e é aberta pelo celular por um link `https://` de um túnel gratuito (Cloudflare Tunnel).** A hospedagem na Railway ([0005](0005-hospedagem.md)) acontece só depois do aceite, já no plano pago pela barbearia.

- Um compose próprio da demonstração sobe `db`, `api` e `web` a partir dos estágios de produção dos Dockerfiles (os mesmos que vão para a Railway), mais o túnel. O banco é separado do banco de desenvolvimento.
- Os dados da demonstração são fictícios e criados por um comando que só roda num banco de demonstração. O banco de produção nasce limpo.
- O login com Google usa o cliente OAuth local, com o endereço do túnel cadastrado no dia, e as contas dos proprietários como usuários de teste.
- O deploy de produção segue a [spec da Railway](../specs/deploy-railway.md), no plano pago pela barbearia.

## Alternativas consideradas
- **Plano Free da Railway perto da reunião:** custo zero e site de verdade, mas sem o `jobs` (limite de 3 serviços), com o projeto pausado do workspace no caminho (limite de 1 projeto) e crédito para cerca de uma semana. Fica como reserva se os proprietários pedirem alguns dias para testar sozinhos.
- **Assinar o Hobby agora:** sistema completo e sem prazo, mas contraria a D9.
- **Hospedar só o web, de graça:** o web não tem dados próprios (vitrine, horários e login dependem da API e do banco). Funcionar sozinho exigiria um "modo demonstração" com dados falsos dentro do web, que não vai para a produção e quebra no agendamento e no login. A Vercel Hobby, a opção gratuita mais direta para Next.js, também proíbe uso comercial.
- **Render + Neon (plano B do 0009):** gratuito e sem prazo, mas os serviços dormem e levam perto de um minuto para acordar, e o deploy seria montado numa plataforma que não é a de produção.
- **Mostrar só na tela do notebook (`localhost`):** sem túnel, mas o proprietário não usa no próprio celular, que é o que mais convence.

## Consequências
- Custo zero e nenhuma conta nova até o aceite. A D9 continua valendo.
- A demonstração depende do notebook ligado e conectado. O link só existe durante a reunião, e os proprietários não testam sozinhos depois.
- O link do túnel gratuito muda toda vez que ele reinicia e não tem garantia de disponibilidade. Ele sobe com antecedência, é cadastrado no Google e fica ligado até o fim da reunião. Se cair, a demonstração segue no próprio notebook.
- A demonstração prova as imagens de produção, mas não a configuração da Railway. Os problemas dela aparecem no deploy de produção, que tem a spec pronta.
- O banco de produção começa sem dados de exemplo.
- É preciso um compose da demonstração, um comando de dados fictícios com testes e o roteiro do dia (#184).
- Este ADR substitui o 0009. A parte do 0009 que dizia que a barbearia paga a hospedagem definitiva depois de aprovar continua valendo aqui.
