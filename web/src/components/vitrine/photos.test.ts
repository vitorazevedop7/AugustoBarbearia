import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const PUBLIC_DIR = resolve("public");
const VITRINE_PHOTOS = [
  "/images/vitrine/hero.jpg",
  "/images/vitrine/sobre.jpg",
];

describe("Fotos placeholder da vitrine (D12)", () => {
  it.each(VITRINE_PHOTOS)("%s existe e é um JPEG de até 400 KB", (path) => {
    const bytes = readFileSync(`${PUBLIC_DIR}${path}`);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(bytes.byteLength).toBeLessThanOrEqual(400_000);
  });
});
