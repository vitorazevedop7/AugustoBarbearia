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
  howChair: {
    src: "/images/vitrine/como-funciona-cadeira.jpg",
    alt: "Cliente na cadeira durante o corte",
    width: 1400,
    height: 1600,
  },
  howPhone: {
    src: "/images/vitrine/como-funciona-celular.jpg",
    alt: "Cliente com o celular na barbearia",
    width: 1050,
    height: 1200,
  },
  servicesHero: {
    src: "/images/vitrine/topo-servicos.jpg",
    alt: "",
    width: 2400,
    height: 1350,
  },
  teamHero: {
    src: "/images/vitrine/topo-equipe.jpg",
    alt: "",
    width: 2400,
    height: 1350,
  },
  mosaicOne: {
    src: "/images/vitrine/mosaico-1.jpg",
    alt: "Lavagem de cabelo, com o cliente visto de costas",
    width: 1200,
    height: 1200,
  },
  mosaicTwo: {
    src: "/images/vitrine/mosaico-2.jpg",
    alt: "Pós-barba nas mãos do barbeiro",
    width: 1200,
    height: 1200,
  },
  mosaicThree: {
    src: "/images/vitrine/mosaico-3.jpg",
    alt: "Nuca com cabelo penteado com pomada",
    width: 1200,
    height: 1200,
  },
  mosaicFour: {
    src: "/images/vitrine/mosaico-4.jpg",
    alt: "Detalhe cromado de uma cadeira de barbeiro",
    width: 1200,
    height: 1200,
  },
  mosaicHighlight: {
    src: "/images/vitrine/mosaico-destaque.jpg",
    alt: "Corte social pronto, visto de costas",
    width: 1600,
    height: 1600,
  },
} satisfies Record<string, VitrinePhoto>;
