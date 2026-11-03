import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, vi } from "vitest";

afterEach(cleanup);

// O jsdom não implementa rolagem nem media queries. O `Alert` com
// `revealOnMount` usa as duas (#157); os testes que conferem a rolagem
// espionam estes métodos. Os testes em ambiente Node não têm `window`.
if (typeof window !== "undefined") {
  window.matchMedia ??= (query: string) =>
    ({
      matches: false,
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }) as unknown as MediaQueryList;
  Element.prototype.scrollIntoView ??= vi.fn();
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
}
