import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
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
    if (!(await getCurrentSession())) redirect("/entrar?voltar=/admin");
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

function AccessProblem({ message }: { message: string }) {
  return (
    <AdminPage title="Administração">
      <Alert tone="danger" title={message} />
    </AdminPage>
  );
}
