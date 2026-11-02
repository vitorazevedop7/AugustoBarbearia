import { describe, expect, it } from "vitest";
import { siteUrl } from "./site-url";

describe("siteUrl", () => {
  it("usa a URL configurada", () => {
    expect(siteUrl("https://augusto.up.railway.app").href).toBe(
      "https://augusto.up.railway.app/",
    );
  });

  it.each([undefined, "", "augusto.up.railway.app"])(
    "volta para localhost com %j, sem lançar",
    (value) => {
      expect(siteUrl(value).href).toBe("http://localhost:3000/");
    },
  );
});
