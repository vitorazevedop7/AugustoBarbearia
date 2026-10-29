import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { Pool } from "pg";
import { apiJwt } from "./auth-jwt";

/**
 * O `next build` carrega este módulo sem segredo e sem banco. Só nessa fase o
 * segredo é provisório e o schema não é conferido; em execução, os dois valem.
 */
const isBuild = process.env.NEXT_PHASE === PHASE_PRODUCTION_BUILD;

/**
 * Login do site (ADR 0003). Também é lido pela CLI do Better Auth em
 * `pnpm auth:migrate`, por isso os imports são relativos.
 * BETTER_AUTH_SECRET e BETTER_AUTH_URL são lidos do ambiente pelo Better Auth.
 */
export const auth = betterAuth({
  secret: isBuild
    ? "valor-provisorio-do-build-nunca-usado-em-execucao"
    : undefined,
  database: new Pool({ connectionString: process.env.DATABASE_URL }),
  advanced: { database: { validateSchema: !isBuild } },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      prompt: "select_account",
    },
  },
  plugins: [
    apiJwt({
      issuer: process.env.AUTH_ISSUER || undefined,
      audience: process.env.AUTH_AUDIENCE || undefined,
    }),
    // Deixa as Server Actions gravarem os cookies do Better Auth. Fica por último.
    nextCookies(),
  ],
});
