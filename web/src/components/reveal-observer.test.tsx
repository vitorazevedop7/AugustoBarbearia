import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RevealObserver } from "./reveal-observer";

/** Simula um navegador com IntersectionObserver e a preferência de movimento. */
function stubBrowser({ reducedMotion }: { reducedMotion: boolean }) {
  const observe = vi.fn();
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = observe;
      unobserve = vi.fn();
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reducedMotion })),
  );
  return { observe };
}

/** Um bloco acima e outro abaixo da dobra (o jsdom não calcula layout). */
function renderBlocks() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top = this.dataset.testid === "abaixo" ? window.innerHeight + 1 : 0;
      return { top } as DOMRect;
    },
  );
  const { container } = render(
    <>
      <div data-reveal data-testid="acima">
        acima
      </div>
      <div data-reveal data-testid="abaixo">
        abaixo
      </div>
      <RevealObserver />
    </>,
  );
  return {
    above: container.querySelector('[data-testid="acima"]'),
    below: container.querySelector('[data-testid="abaixo"]'),
  };
}

describe("RevealObserver", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("esconde só o que está abaixo da dobra e observa a entrada", () => {
    const { observe } = stubBrowser({ reducedMotion: false });
    const { above, below } = renderBlocks();

    expect(above).not.toHaveAttribute("data-reveal", "pending");
    expect(below).toHaveAttribute("data-reveal", "pending");
    expect(observe).toHaveBeenCalledExactlyOnceWith(below);
  });

  it("não esconde nada quando o navegador não tem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { below } = renderBlocks();

    expect(below).not.toHaveAttribute("data-reveal", "pending");
  });

  it("não esconde nada com pedido de menos movimento", () => {
    stubBrowser({ reducedMotion: true });
    const { below } = renderBlocks();

    expect(below).not.toHaveAttribute("data-reveal", "pending");
  });
});
