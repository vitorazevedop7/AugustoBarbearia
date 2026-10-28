import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RevealObserver } from "./reveal-observer";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));

describe("RevealObserver", () => {
  it("não esconde nada quando o navegador não tem IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { container } = render(
      <>
        <div data-reveal>conteúdo</div>
        <RevealObserver />
      </>,
    );

    expect(container.querySelector("[data-reveal]")).not.toHaveAttribute(
      "data-reveal",
      "pending",
    );
    vi.unstubAllGlobals();
  });
});
