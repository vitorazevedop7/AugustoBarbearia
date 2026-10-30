import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// O Vitest roda na raiz do web; no jsdom, `import.meta.url` não é um caminho.
const PUBLIC_DIR = resolve("public");

// Os caminhos que a migração 0007 da API grava nos proprietários (D10).
const OWNER_PHOTOS = [
  "/images/barbeiros/edvaldo.jpg",
  "/images/barbeiros/lauro.jpg",
  "/images/barbeiros/manoel.jpg",
];

describe("Fotos placeholder dos proprietários", () => {
  it.each(OWNER_PHOTOS)("%s existe e é um JPEG", (path) => {
    const bytes = readFileSync(`${PUBLIC_DIR}${path}`);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
  });
});
