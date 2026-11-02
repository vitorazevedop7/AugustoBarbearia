import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vitrinePhotos } from "@/lib/vitrine-photos";
import { FixedPhotoLayer } from "./fixed-photo-layer";
import { FramedPhoto } from "./framed-photo";

describe("fotos compartilhadas da vitrine", () => {
  it("reserva a proporção e mantém alt, lazy e menos movimento na moldura", () => {
    render(
      <FramedPhoto
        photo={vitrinePhotos.about}
        sizes="50vw"
        ratioClassName="aspect-[7/8]"
        data-reveal="zoom"
      />,
    );
    const photo = screen.getByRole("img", { name: vitrinePhotos.about.alt });
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).toHaveAttribute("sizes", "50vw");
    expect(photo).toHaveClass("motion-reduce:group-hover:scale-100");
    expect(photo.parentElement).toHaveClass("aspect-[7/8]", "overflow-hidden");
    expect(photo.parentElement).toHaveAttribute("data-reveal", "zoom");
  });

  it("a camada decorativa só prioriza a foto quando é o hero inicial", () => {
    const { rerender, container } = render(
      <FixedPhotoLayer photo={vitrinePhotos.hero} preload />,
    );
    const photo = screen.getByRole("presentation");
    expect(photo).toHaveAttribute("fetchpriority", "high");
    expect(photo).not.toHaveAttribute("loading", "lazy");
    expect(photo.parentElement).toHaveClass("absolute", "inset-0", "lg:fixed");
    expect(container.querySelector(".bg-ink\\/70")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
    rerender(<FixedPhotoLayer photo={vitrinePhotos.hero} />);
    expect(photo).toHaveAttribute("loading", "lazy");
    expect(photo).not.toHaveAttribute("fetchpriority");
  });
});
