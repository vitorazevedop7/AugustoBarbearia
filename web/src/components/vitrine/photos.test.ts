import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { vitrinePhotos } from "@/lib/vitrine-photos";

const PUBLIC_DIR = resolve("public");
const VITRINE_PHOTOS = [
  "/images/vitrine/hero.jpg",
  "/images/vitrine/sobre.jpg",
  "/images/vitrine/faixa-agendar.jpg",
];

/** Largura e altura do primeiro quadro SOF de um JPEG. */
function jpegSize(bytes: Buffer): { width: number; height: number } {
  let offset = 2;
  while (offset < bytes.length) {
    const marker = bytes[offset + 1];
    const length = bytes.readUInt16BE(offset + 2);
    const isFrame =
      marker >= 0xc0 &&
      marker <= 0xcf &&
      marker !== 0xc4 &&
      marker !== 0xc8 &&
      marker !== 0xcc;
    if (isFrame) {
      return {
        height: bytes.readUInt16BE(offset + 5),
        width: bytes.readUInt16BE(offset + 7),
      };
    }
    offset += 2 + length;
  }
  throw new Error("JPEG sem quadro SOF");
}

describe("Cadastro das fotos da vitrine", () => {
  it.each(Object.entries(vitrinePhotos))(
    "%s é um JPEG de até 400 KB com as dimensões cadastradas",
    (_, photo) => {
      const bytes = readFileSync(`${PUBLIC_DIR}${photo.src}`);
      expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
      expect(bytes.byteLength).toBeLessThanOrEqual(400_000);
      expect(jpegSize(bytes)).toEqual({
        width: photo.width,
        height: photo.height,
      });
    },
  );
});

describe("Fotos placeholder da vitrine (D12)", () => {
  it.each(VITRINE_PHOTOS)("%s existe e é um JPEG de até 400 KB", (path) => {
    const bytes = readFileSync(`${PUBLIC_DIR}${path}`);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(bytes.byteLength).toBeLessThanOrEqual(400_000);
  });
});

describe("Galeria da vitrine (D14)", () => {
  it.each([
    "galeria-degrade",
    "galeria-navalha",
    "galeria-ferramentas",
    "galeria-barba",
  ])("%s é JPEG de até 300 KB", (name) => {
    const bytes = readFileSync(`${PUBLIC_DIR}/images/vitrine/${name}.jpg`);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(bytes.byteLength).toBeLessThanOrEqual(300_000);
  });
});

describe("Fotos de Como funciona (D14)", () => {
  it.each([
    ["como-funciona-cadeira", 300_000],
    ["como-funciona-celular", 250_000],
  ])("%s é JPEG de até %i bytes", (name, maxBytes) => {
    const bytes = readFileSync(`${PUBLIC_DIR}/images/vitrine/${name}.jpg`);
    expect([...bytes.subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    expect(bytes.byteLength).toBeLessThanOrEqual(maxBytes);
  });
});
