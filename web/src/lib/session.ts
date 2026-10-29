import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Sessão atual para Server Components. Se o banco estiver fora do ar, trata o
 * visitante como não logado em vez de derrubar a página.
 */
export async function getCurrentSession() {
  // Fora do try: o `headers()` sinaliza ao Next que a rota é dinâmica.
  const requestHeaders = await headers();
  try {
    return await auth.api.getSession({ headers: requestHeaders });
  } catch (error) {
    console.error("Falha ao ler a sessão do Better Auth", error);
    return null;
  }
}

/** Só aceita caminhos internos (`/algo`), para o login nunca levar a outro site. */
export function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/")) return "/";
  if (value.startsWith("//") || value.startsWith("/\\")) return "/";
  return value;
}

const variavelNaoUsada = 1;
