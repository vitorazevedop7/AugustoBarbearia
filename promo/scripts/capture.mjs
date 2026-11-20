// Percorre a demonstração local (http://localhost:3001) e grava, para cada passo,
// a captura da tela e a posição do elemento clicado em seguida. O vídeo anima o
// cursor e as trocas de tela a partir disso.
// Uso: node scripts/capture.mjs  → public/demo/*.png e src/demo-steps.json
import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.DEMO_BASE ?? "http://localhost:3001";
const OUT = "public/demo";
mkdirSync(OUT, { recursive: true });

const steps = [];
const DESKTOP = { viewport: { width: 1440, height: 810 }, deviceScaleFactor: 4 / 3 };
const MOBILE = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };

const browser = await chromium.launch({ channel: "chrome" });

async function settle(page) {
  await page.waitForLoadState("networkidle").catch(() => {});
  // espera o conteúdo real no lugar do esqueleto de carregamento (loading.tsx)
  await page.waitForFunction(() => document.querySelector("main h1, main h2"), null, { timeout: 15000 }).catch(() => {});
  // termina as animações de entrada da vitrine e esconde o cursor de texto
  await page.addStyleTag({
    content: `*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}
      [data-reveal-state="pending"]{opacity:1!important;translate:none!important;transform:none!important}
      nextjs-portal{display:none!important}`,
  });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(250);
}

/** Grava a tela atual. `target` é o locator que o cursor vai clicar a seguir. */
async function shot(page, id, { target, full = false, scale = DESKTOP.deviceScaleFactor, note } = {}) {
  if (target) {
    await target.scrollIntoViewIfNeeded().catch(() => {});
    // folga embaixo, para o alvo não ficar colado na borda da tela
    await page.evaluate(() => window.scrollBy(0, 0));
  }
  await settle(page);
  if (full) await loadAllImages(page);
  const file = `${id}.png`;
  await page.screenshot({ path: `${OUT}/${file}`, fullPage: full });
  let box = null;
  if (target) {
    const b = await target.boundingBox();
    if (b) box = { x: b.x * scale, y: b.y * scale, w: b.width * scale, h: b.height * scale };
  }
  const dims = await page.evaluate(() => ({
    w: window.innerWidth,
    h: document.documentElement.scrollHeight,
    vh: window.innerHeight,
  }));
  steps.push({ id, file, box, full, height: Math.round((full ? dims.h : dims.vh) * scale), note });
  console.log("ok", id, box ? "alvo" : "", full ? `página ${dims.h}px` : "");
  return box;
}

// As imagens abaixo da dobra são lazy (next/image): sem rolar, a captura da
// página inteira sai com as molduras vazias. Rola até o fim e espera todas.
async function loadAllImages(page) {
  await page.evaluate(async () => {
    for (const img of document.querySelectorAll("img")) img.loading = "eager";
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    await Promise.all(
      [...document.images].map((img) =>
        img.complete && img.naturalWidth > 0
          ? null
          : new Promise((r) => {
              img.addEventListener("load", r, { once: true });
              img.addEventListener("error", r, { once: true });
              setTimeout(r, 8000);
            }),
      ),
    );
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(400);
  const missing = await page.evaluate(() => [...document.images].filter((i) => !i.naturalWidth).map((i) => i.src));
  if (missing.length) console.warn("imagens sem carregar:", missing);
}

async function clickAndWait(page, locator) {
  const before = page.url();
  await locator.click();
  await page.waitForURL((u) => u.toString() !== before, { timeout: 15000 }).catch(() => {});
  await page.waitForLoadState("networkidle").catch(() => {});
}

// ------------------------------------------------------------ cliente
{
  const ctx = await browser.newContext({ ...DESKTOP, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await shot(page, "c01-vitrine-topo");
  await shot(page, "c02-vitrine-pagina", { full: true });

  await page.goto(BASE + "/agendar");
  let t = page.getByRole("link", { name: /Lauro/ }).first();
  await shot(page, "c03-barbeiro", { target: t });
  await clickAndWait(page, t);

  t = page.getByRole("link", { name: /Corte \+ Barba/ }).first();
  await shot(page, "c04-servico", { target: t });
  await clickAndWait(page, t);

  t = page.locator("main a[href*='data=']").nth(2);
  await shot(page, "c05-dia", { target: t });
  await clickAndWait(page, t);

  t = page.locator("main a[href*='hora=']").nth(3);
  await shot(page, "c06-horario", { target: t });
  await clickAndWait(page, t);

  // sem login, a confirmação leva para /entrar e volta depois
  t = page.getByRole("button", { name: "Entrar como cliente (demo)" });
  await shot(page, "c08-entrar", { target: t });
  await clickAndWait(page, t);
  await page.waitForURL(/\/agendar/, { timeout: 15000 });

  t = page.getByRole("button", { name: /Confirmar/ }).first();
  await shot(page, "c09-confirmar", { target: t });
  await clickAndWait(page, t);
  await page.waitForURL(/confirmado/, { timeout: 15000 }).catch(() => {});
  await shot(page, "c10-confirmado");

  await page.goto(BASE + "/meus-agendamentos");
  await shot(page, "c11-meus", { target: page.getByRole("link", { name: /remarcar/i }).first() });
  await ctx.close();
}

// ------------------------------------------------------------ administração
{
  const ctx = await browser.newContext({ ...DESKTOP, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/entrar");
  let t = page.getByRole("button", { name: "Entrar como administração (demo)" });
  await shot(page, "a01-entrar", { target: t });
  await clickAndWait(page, t);
  await page.waitForURL(/\/admin/, { timeout: 15000 });
  await shot(page, "a02-painel");
  await shot(page, "a03-painel-pagina", { full: true });

  await page.goto(BASE + "/admin/agenda");
  t = page.getByRole("link", { name: /^semana$/i });
  await shot(page, "a04-agenda-dia", { target: t });
  await clickAndWait(page, t);
  await shot(page, "a05-agenda-semana");

  await page.goto(BASE + "/admin/agenda");
  // um agendamento ainda em aberto, para concluir
  t = page.locator("main a[href^='/admin/agenda/']").filter({ hasText: /Agendado/ }).first();
  if (!(await t.count())) t = page.locator("main a[href^='/admin/agenda/'][href$='']").filter({ hasText: /\d\d:\d\d/ }).first();
  await shot(page, "a06-agenda-escolher", { target: t });
  await clickAndWait(page, t);

  t = page.getByRole("radio", { name: "Pix" });
  await shot(page, "a07-detalhe", { full: true });
  const pix = page.locator("label").filter({ has: page.getByRole("radio", { name: "Pix" }) }).first();
  await shot(page, "a08-forma", { target: (await pix.count()) ? pix : t });
  await pix.click().catch(() => t.check({ force: true }));
  t = page.getByRole("button", { name: "Concluir atendimento" });
  await shot(page, "a09-concluir", { target: t });
  await clickAndWait(page, t);
  await page.waitForTimeout(800);
  await shot(page, "a10-concluido");

  await page.goto(BASE + "/admin/relatorio");
  t = page.getByRole("link", { name: /exportar csv/i });
  await shot(page, "a11-relatorio", { target: t });
  await shot(page, "a12-relatorio-pagina", { full: true });
  await ctx.close();
}

// ------------------------------------------------------------ celular
{
  const ctx = await browser.newContext({ ...MOBILE, locale: "pt-BR", timezoneId: "America/Sao_Paulo" });
  const page = await ctx.newPage();
  await page.goto(BASE + "/");
  await shot(page, "m01-vitrine", { scale: 2 });
  await page.goto(BASE + "/agendar");
  const t = page.getByRole("link", { name: /Edvaldo/ }).first();
  await shot(page, "m02-barbeiro", { target: t, scale: 2 });
  await clickAndWait(page, t);
  await clickAndWait(page, page.getByRole("link", { name: /Corte Simples/ }).first());
  await shot(page, "m03-dia", { scale: 2 });
  await ctx.close();
}

await browser.close();
writeFileSync("src/demo-steps.json", JSON.stringify(steps, null, 2));
console.log(steps.length, "passos gravados");
