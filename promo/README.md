# Vídeos da Augusto Barbearia

Projeto [Remotion](https://www.remotion.dev/) que gera os vídeos de apresentação do sistema. Fica fora do produto: não é usado pela `api` nem pelo `web` e não entra no CI.

| Composição | Duração | O que mostra |
|---|---|---|
| `Demonstracao` | 1min11 | O sistema em uso, clicando nas telas reais da demonstração local: agendamento do cliente, celular, painel, agenda, conclusão do atendimento e relatório. É o vídeo do README (`docs/media/demonstracao.mp4`) |
| `Comercial` | 54s | Peça de propaganda, com as capturas de `docs/media/` e fotos da vitrine |

Os dois têm 1920×1080 a 30 fps. A trilha e os efeitos sonoros são sintetizados por código (`scripts/audio.mjs`), sem samples nem música de terceiros. Cores e fontes seguem `docs/design/identidade-visual.md` (`src/ui.tsx`).

## Pré-requisitos

- Node.js 20.19+ (o repositório usa o 24) e `npm`.
- Para regravar as telas da `Demonstracao`: Docker e o Google Chrome instalados (o Playwright usa o Chrome da máquina).

## Comandos

```bash
cd promo
npm ci
npm run audio                 # gera public/audio/*.wav (trilhas e efeitos)
npm run capture               # grava as telas da demonstração em public/demo/ (ver abaixo)
npm run dev                   # Remotion Studio, para ver e ajustar
npm run render:demonstracao   # out/augusto-barbearia-demonstracao.mp4
npm run render:comercial      # out/augusto-barbearia-comercial.mp4
npm run lint
```

`out/`, `public/audio/` e `public/demo/` são gerados e ficam fora do git. O `Comercial` só precisa do `npm run audio`; a `Demonstracao` precisa também das capturas.

## Capturas da demonstração

`scripts/capture.mjs` abre a demonstração local (`docker-compose.demo.yml`, em `http://localhost:3001`) com o Playwright, percorre os fluxos do cliente, da administração e do celular e grava, para cada passo, a tela em 1920×1080 e a posição do botão clicado em seguida (`src/demo-steps.json`). O vídeo anima o cursor e as trocas de tela a partir disso.

Antes de capturar, rode na raiz do repositório:

```bash
bash promo/scripts/reset-demo.sh
```

Ele **apaga e recria o banco da demonstração** (`augusto_demo`, só dados fictícios do seed), sobe o compose sem o túnel e reabre o último atendimento já iniciado de hoje do Edvaldo, porque a conclusão só é possível depois do início (RN-31). A captura cria um agendamento do cliente fictício e conclui esse atendimento; para capturar de novo, rode o reset outra vez. Ao terminar:

```bash
DEMO_URL=http://localhost:3001 docker compose -f docker-compose.demo.yml --env-file .env.demo down
```

## Onde mudar

- Roteiro, tempos e legendas da `Demonstracao`: `src/demo/timeline.ts`. A cena, o cursor e a moldura ficam em `src/demo/Demo.tsx`.
- Passos capturados (rotas, botões clicados): `scripts/capture.mjs`. Uma captura nova precisa de um item na `timeline.ts`.
- Cenas do `Comercial`: `src/scenes.tsx`; tempos e efeitos sonoros: `src/Promo.tsx`.
- Trilhas: `scripts/audio.mjs`. A do `Comercial` acompanha os cortes a 120 BPM; a da `Demonstracao` tem os impactos nos cartões de capítulo e no encerramento (`CHAPTERS` e `FINAL`), que precisam mudar junto com a `timeline.ts`.

O Remotion é gratuito para equipes de até três pessoas ([licença](https://www.remotion.dev/docs/license)).
