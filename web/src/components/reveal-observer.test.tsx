import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RevealObserver } from "./reveal-observer";

/** Simula um navegador com IntersectionObserver e a preferência de movimento. */
function stubBrowser({ reducedMotion }: { reducedMotion: boolean }) {
  const observe = vi.fn();
  const unobserve = vi.fn();
  const options = vi.fn();
  const callback: {
    current?: (entries: Partial<IntersectionObserverEntry>[]) => void;
  } = {};
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(
        handler: (entries: Partial<IntersectionObserverEntry>[]) => void,
        observerOptions: IntersectionObserverInit,
      ) {
        callback.current = handler;
        options(observerOptions);
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = vi.fn();
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: reducedMotion })),
  );
  return { observe, unobserve, callback, options };
}

/** Um bloco acima da dobra e um abaixo de cada preset (o jsdom não calcula layout). */
function renderBlocks() {
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(
    function (this: HTMLElement) {
      const top = this.dataset.testid === "acima" ? 0 : window.innerHeight + 1;
      return { top } as DOMRect;
    },
  );
  const { container } = render(
    <>
      <div data-reveal="rise" data-testid="acima">
        acima
      </div>
      <div data-reveal="rise" data-testid="rise">
        rise
      </div>
      <div data-reveal="" data-testid="vazio">
        vazio
      </div>
      <div data-reveal="fade" data-testid="fade">
        fade
      </div>
      <div data-reveal="zoom" data-reveal-delay="400" data-testid="zoom">
        zoom
      </div>
      <RevealObserver />
    </>,
  );
  const find = (id: string) =>
    container.querySelector<HTMLElement>(`[data-testid="${id}"]`);
  return {
    above: find("acima") ?? undefined,
    rise: find("rise") ?? undefined,
    empty: find("vazio") ?? undefined,
    fade: find("fade") ?? undefined,
    zoom: find("zoom") ?? undefined,
  };
}

describe("RevealObserver", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("esconde só o que está abaixo da dobra e observa a entrada", () => {
    const { observe } = stubBrowser({ reducedMotion: false });
    const { above, rise, empty, fade, zoom } = renderBlocks();

    expect(above).not.toHaveAttribute("data-reveal-state");
    for (const hidden of [rise, empty, fade, zoom]) {
      expect(hidden).toHaveAttribute("data-reveal-state", "pending");
    }
    expect(observe).toHaveBeenCalledTimes(4);
    expect(observe).not.toHaveBeenCalledWith(above);
  });

  it("antecipa a entrada com margem fixa, sem esperar uma fração do card alto", () => {
    const { options } = stubBrowser({ reducedMotion: false });
    renderBlocks();

    expect(options).toHaveBeenCalledExactlyOnceWith({
      rootMargin: "0px 0px 96px 0px",
      threshold: 0,
    });
  });

  it("mantém o preset em data-reveal e grava o estado à parte", () => {
    stubBrowser({ reducedMotion: false });
    const { rise, empty, fade, zoom } = renderBlocks();

    expect(rise).toHaveAttribute("data-reveal", "rise");
    expect(empty).toHaveAttribute("data-reveal", "");
    expect(fade).toHaveAttribute("data-reveal", "fade");
    expect(zoom).toHaveAttribute("data-reveal", "zoom");
  });

  it("passa o atraso de data-reveal-delay para --reveal-delay", () => {
    stubBrowser({ reducedMotion: false });
    const { rise, zoom } = renderBlocks();

    expect(zoom?.style.getPropertyValue("--reveal-delay")).toBe("400ms");
    // Sem o atributo, vale o padrão de 200ms do CSS.
    expect(rise?.style.getPropertyValue("--reveal-delay")).toBe("");
  });

  it("revela uma única vez ao entrar na tela", () => {
    const { callback, unobserve } = stubBrowser({ reducedMotion: false });
    const { zoom } = renderBlocks();

    callback.current?.([{ isIntersecting: false, target: zoom }]);
    expect(zoom).toHaveAttribute("data-reveal-state", "pending");

    callback.current?.([{ isIntersecting: true, target: zoom }]);
    expect(zoom).toHaveAttribute("data-reveal-state", "done");
    expect(unobserve).toHaveBeenCalledExactlyOnceWith(zoom);
  });

  it("não esconde nada quando o navegador não tem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { rise, zoom } = renderBlocks();

    expect(rise).not.toHaveAttribute("data-reveal-state");
    expect(zoom).not.toHaveAttribute("data-reveal-state");
  });

  it("não esconde nada com pedido de menos movimento", () => {
    const { observe } = stubBrowser({ reducedMotion: true });
    const { rise, fade, zoom } = renderBlocks();

    for (const block of [rise, fade, zoom]) {
      expect(block).not.toHaveAttribute("data-reveal-state");
    }
    expect(zoom?.style.getPropertyValue("--reveal-delay")).toBe("");
    expect(observe).not.toHaveBeenCalled();
  });
});
