import type { PublicBarber, PublicService, PublicShop } from "@/lib/api/public";

/** Dados da vitrine para os testes, no formato das rotas `/public`. */
export const shop: PublicShop = {
  name: "Augusto Barbearia",
  tagline: null,
  about: null,
  address: null,
  phone: null,
  whatsapp: null,
  instagram: null,
  email: null,
  business_hours: [
    ...[0, 1, 2, 3, 4].map((weekday) => ({
      weekday,
      opens_at: "10:00:00",
      closes_at: "19:00:00",
    })),
    { weekday: 5, opens_at: "09:00:00", closes_at: "14:00:00" },
    { weekday: 6, opens_at: null, closes_at: null },
  ],
};

const owners = [
  { id: 1, name: "Edvaldo" },
  { id: 2, name: "Lauro" },
  { id: 3, name: "Manoel" },
];

export function service(
  id: number,
  name: string,
  changes: Partial<PublicService> = {},
): PublicService {
  return {
    id,
    name,
    description: null,
    price: "25.00",
    duration_minutes: 30,
    barbers: owners,
    ...changes,
  };
}

export const services: PublicService[] = [
  service(2, "Corte + Barba", { price: "35.00", duration_minutes: 45 }),
  service(1, "Corte Simples"),
];

export const barbers: PublicBarber[] = owners.map(({ id, name }) => ({
  id,
  name,
  photo_path: null,
  bio: null,
}));
