/**
 * Tags do cache das leituras da vitrine (`public.ts`). As Server Actions da
 * administração que mudam esses dados chamam `updateTag` com elas, para a
 * mudança aparecer no próximo carregamento (RN-60, RN-61).
 */
export const PUBLIC_TAGS = {
  shop: "public-shop",
  services: "public-services",
  barbers: "public-barbers",
} as const;
