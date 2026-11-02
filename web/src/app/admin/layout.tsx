import type { Metadata } from "next";
import type { ReactNode } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { REQUESTED_PATH_HEADER } from "@/lib/requested-path";
import { getCurrentSession, safeRedirectPath } from "@/lib/session";
import { AdminNav } from "./admin-nav";
import { AdminPage } from "./admin-page";

export const metadata: Metadata = {
  title: "Administração — Augusto Barbearia",
  robots: { index: false },
};

const unavailableMessage =
  "Não foi possível verificar seu acesso. Tente novamente em instantes.";

/**
 * Toda página de `/admin` passa por aqui. A API decide a permissão (RN-71); o
 * web apenas segue a resposta e só então mostra a navegação e a página.
 */
export default async function AdminLayout({
  children,
}: {
  children: ReactNode;
}) {
  let result;
  try {
    result = await createApiClient().GET("/admin/ping", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return <AccessProblem message={unavailableMessage} />;
  }

  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  if (result.response.status === 401) {
    if (!(await getCurrentSession())) redirect(await loginPath());
    // Uma sessão válida voltaria de /entrar para cá, causando um ciclo quando
    // a API rejeita o JWT (por exemplo, durante uma falha na busca do JWKS).
    return <AccessProblem message={unavailableMessage} />;
  }
  if (result.response.status === 403) redirect("/");

  if (result.response.status !== 200 || result.data?.status !== "ok") {
    const message =
      typeof result.error === "object" ? result.error?.message : undefined;
    return <AccessProblem message={message || unavailableMessage} />;
  }

  return (
    <>
      <AdminNav />
      {children}
    </>
  );
}

/**
 * O login volta à página pedida, com a busca (filtros, período), validada como
 * a do cliente. Fora de `/admin` ou sem o cabeçalho, volta ao início dela.
 */
async function loginPath(): Promise<string> {
  const requested = safeRedirectPath(
    (await headers()).get(REQUESTED_PATH_HEADER),
  );
  const back = /^\/admin(?:[/?]|$)/.test(requested) ? requested : "/admin";
  return `/entrar?voltar=${encodeURIComponent(back)}`;
}

function AccessProblem({ message }: { message: string }) {
  return (
    <AdminPage title="Administração">
      <Alert tone="danger" title={message} />
    </AdminPage>
  );
}
