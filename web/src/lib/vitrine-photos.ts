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
  galleryFade: {
    src: "/images/vitrine/galeria-degrade.jpg",
    alt: "Barbeiro acertando um degradê com a máquina",
    width: 1200,
    height: 1800,
  },
  galleryRazor: {
    src: "/images/vitrine/galeria-navalha.jpg",
    alt: "Barba feita na navalha, com toalha quente",
    width: 1500,
    height: 1200,
  },
  galleryTools: {
    src: "/images/vitrine/galeria-ferramentas.jpg",
    alt: "Tesoura, pente e pincel na bancada",
    width: 1400,
    height: 1400,
  },
  galleryBeard: {
    src: "/images/vitrine/galeria-barba.jpg",
    alt: "Acabamento de barba com máquina e pente",
    width: 1200,
    height: 1800,
  },
  bookingBand: {
    src: "/images/vitrine/faixa-agendar.jpg",
    alt: "",
    width: 2400,
    height: 1350,
  },
} satisfies Record<string, VitrinePhoto>;
