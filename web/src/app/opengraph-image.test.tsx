// @vitest-environment node
import { describe, expect, it } from "vitest";
import OpenGraphImage, { alt, contentType, size } from "./opengraph-image";

describe("imagem de compartilhamento", () => {
  it("rasteriza os assets locais em PNG 1200×630 abaixo de 300 KB", async () => {
    const response = await OpenGraphImage();
    const bytes = Buffer.from(await response.arrayBuffer());

    expect(response.headers.get("content-type")).toBe(contentType);
    expect(bytes.subarray(0, 8)).toEqual(
      Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    );
    // O IHDR confirma o tamanho do arquivo renderizado, não só os metadados.
    expect(bytes.readUInt32BE(16)).toBe(size.width);
    expect(bytes.readUInt32BE(20)).toBe(size.height);
    // O WhatsApp descarta miniaturas grandes demais.
    expect(bytes.byteLength).toBeLessThan(300_000);
    expect(alt).toBe("Augusto Barbearia");
  });
});
