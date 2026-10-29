import { APIError } from "better-auth/api";
import { jwt } from "better-auth/plugins";

/**
 * JWT que o web manda para a API (ADR 0003): EdDSA/Ed25519, 15 minutos, e só
 * `sub`, `email` e `name`. O papel não vai no token; a API decide (RN-71).
 */
export function apiJwt({
  issuer,
  audience,
}: {
  issuer?: string;
  audience?: string;
}) {
  return jwt({
    jwks: { keyPairConfig: { alg: "EdDSA", crv: "Ed25519" } },
    jwt: {
      issuer,
      audience,
      expirationTime: "15m",
      definePayload: ({ user }) => ({ email: user.email, name: user.name }),
    },
  });
}

type AuthWithJwt = {
  api: {
    getToken: (context: { headers: Headers }) => Promise<{ token: string }>;
  };
};

/** Emite o JWT da sessão contida nos headers, ou `null` se não há sessão. */
export async function issueApiToken(
  auth: AuthWithJwt,
  headers: Headers,
): Promise<string | null> {
  try {
    const { token } = await auth.api.getToken({ headers });
    return token;
  } catch (error) {
    if (error instanceof APIError && error.statusCode === 401) {
      return null;
    }
    throw error;
  }
}
