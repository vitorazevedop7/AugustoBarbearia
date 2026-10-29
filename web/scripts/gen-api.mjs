// Gera src/lib/api/schema.d.ts a partir do OpenAPI da API (ADR 0008).
// Uso: `pnpm gen:api [arquivo-ou-url]`. Sem argumento, lê
// `$API_INTERNAL_URL/openapi.json` (padrão http://localhost:8000). Um arquivo
// vem de `uv run python -m app.export_openapi`, e o caminho é relativo a web/.
import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import openapiTS, { astToString } from "openapi-typescript";

const HEADER = `/**
 * GERADO por \`pnpm gen:api\` a partir do OpenAPI da API (ADR 0008).
 * Não edite à mão: mude os schemas da API e rode o comando de novo.
 */

`;

const output = new URL("../src/lib/api/schema.d.ts", import.meta.url);
const source = resolveSource(process.argv[2]);

function resolveSource(arg) {
  if (!arg) {
    const base = process.env.API_INTERNAL_URL || "http://localhost:8000";
    return new URL(`${base.replace(/\/+$/, "")}/openapi.json`);
  }
  return /^https?:\/\//.test(arg) ? new URL(arg) : pathToFileURL(resolve(arg));
}

try {
  const ast = await openapiTS(source);
  await writeFile(output, HEADER + astToString(ast));
  console.log(`Tipos gerados de ${source.href} em src/lib/api/schema.d.ts.`);
} catch (error) {
  console.error(`Não foi possível gerar os tipos a partir de ${source.href}.`);
  console.error(
    "Confira se a API está no ar ou passe o arquivo exportado por `uv run python -m app.export_openapi`.",
  );
  console.error(error);
  process.exitCode = 1;
}
