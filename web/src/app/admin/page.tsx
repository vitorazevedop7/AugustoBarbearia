import type { Metadata } from "next";
import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";

export const metadata: Metadata = {
  title: "Administração — Augusto Barbearia",
  robots: { index: false },
};

const unavailableMessage =
  "Não foi possível verificar seu acesso. Tente novamente em instantes.";

/** A API decide a permissão (RN-71); o web apenas segue a resposta. */
export default async function AdminPage() {
  let result;
  try {
    result = await createApiClient().GET("/admin/ping", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return (
      <AdminContent>
        <Alert tone="danger" title={unavailableMessage} />
      </AdminContent>
    );
  }

  // redirect lança uma exceção do Next e precisa ficar fora do catch de rede.
  if (result.response.status === 401) {
    if (!(await getCurrentSession())) redirect("/entrar?voltar=/admin");
    // Uma sessão válida voltaria de /entrar para cá, causando um ciclo quando
    // a API rejeita o JWT (por exemplo, durante uma falha na busca do JWKS).
    return (
      <AdminContent>
        <Alert tone="danger" title={unavailableMessage} />
      </AdminContent>
    );
  }
  if (result.response.status === 403) redirect("/");

  if (result.response.status !== 200 || result.data?.status !== "ok") {
    const message =
      typeof result.error === "object" ? result.error?.message : undefined;
    return (
      <AdminContent>
        <Alert tone="danger" title={message || unavailableMessage} />
      </AdminContent>
    );
  }

  return (
    <AdminContent>
      <Alert tone="success" title="Acesso permitido" />
    </AdminContent>
  );
}

function AdminContent({ children }: { children: ReactNode }) {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8 lg:py-12"
    >
      <h1 className="text-2xl font-semibold text-ink">Administração</h1>
      <div className="mt-6 max-w-2xl">{children}</div>
    </main>
  );
}
