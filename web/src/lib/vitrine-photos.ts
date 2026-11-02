/** Fotos fictícias da vitrine (D12/D14). Trocar pelos arquivos reais na P10. */
export type VitrinePhoto = {
  src: string;
  alt: string;
  width: number;
  height: number;
};

export const vitrinePhotos = {
  hero: {
    src: "/images/vitrine/hero.jpg",
    alt: "",
    width: 2400,
    height: 1350,
  },
  about: {
    src: "/images/vitrine/sobre.jpg",
    alt: "Mãos de barbeiro com tesoura durante um corte de cabelo",
    width: 1800,
    height: 1200,
  },
} satisfies Record<string, VitrinePhoto>;
