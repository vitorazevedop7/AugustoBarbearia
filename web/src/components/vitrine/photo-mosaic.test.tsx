import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { vitrinePhotos } from "@/lib/vitrine-photos";
import { PhotoMosaic } from "./photo-mosaic";

describe("mosaico da vitrine", () => {
  it("mostra cinco fotos com descrição, começando pelo destaque", () => {
    render(<PhotoMosaic />);

    const mosaic = screen.getByRole("region", { name: "Nosso trabalho" });
    const photos = within(mosaic).getAllByRole("img");
    expect(photos).toHaveLength(5);
    expect(photos[0]).toHaveAccessibleName(vitrinePhotos.mosaicHighlight.alt);

    for (const photo of [
      vitrinePhotos.mosaicHighlight,
      vitrinePhotos.mosaicOne,
      vitrinePhotos.mosaicTwo,
      vitrinePhotos.mosaicThree,
      vitrinePhotos.mosaicFour,
    ]) {
      const image = within(mosaic).getByRole("img", { name: photo.alt });
      expect(decodeURIComponent(image.getAttribute("src")!)).toContain(
        photo.src,
      );
      expect(image).toHaveAttribute("loading", "lazy");
      expect(image).not.toHaveAttribute("fetchpriority", "high");
    }
  });

  it("abre o perfil cadastrado no Instagram em outra aba", () => {
    render(<PhotoMosaic instagram="augusto.barbearia" />);

    const link = screen.getByRole("link", { name: /Ver mais no Instagram/ });
    expect(link).toHaveAttribute(
      "href",
      "https://www.instagram.com/augusto.barbearia/",
    );
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it.each([undefined, null, ""])(
    "mantém as fotos e omite o link sem perfil cadastrado (%s)",
    (instagram) => {
      render(<PhotoMosaic instagram={instagram} />);

      expect(screen.getAllByRole("img")).toHaveLength(5);
      expect(screen.queryByRole("link")).toBeNull();
      expect(
        screen.getByRole("heading", { level: 2, name: "Nosso trabalho" }),
      ).toBeVisible();
    },
  );
});
