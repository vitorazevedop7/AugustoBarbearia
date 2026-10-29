import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { createApiClient } from "@/lib/api/client";
import { getCurrentSession } from "@/lib/session";
import { ProfileContent } from "./profile-content";
import { ProfileForm } from "./profile-form";
import {
  apiErrorMessage,
  toFormValues,
  unavailableMessage,
} from "./profile-state";

export const metadata: Metadata = {
  title: "Meu perfil — Augusto Barbearia",
  robots: { index: false },
};

/** Perfil do cliente. A API cria ou vincula o cadastro no primeiro acesso (RN-23). */
export default async function ProfilePage() {
  if (!(await getCurrentSession())) redirect("/entrar?voltar=/perfil");

  let result;
  try {
    result = await createApiClient().GET("/me/profile", {
      signal: AbortSignal.timeout(5000),
    });
  } catch {
    return (
      <ProfileContent>
        <Alert tone="danger" title={unavailableMessage} />
      </ProfileContent>
    );
  }

  // A administração não tem perfil de cliente (RN-71).
  if (result.response.status === 403) redirect("/admin");
  if (!result.data) {
    // 401 com sessão válida (ex.: JWKS indisponível) também cai aqui, sem
    // mandar de volta ao login, o que causaria um ciclo.
    const message =
      result.response.status === 401
        ? undefined
        : apiErrorMessage(result.error);
    return (
      <ProfileContent>
        <Alert tone="danger" title={message || unavailableMessage} />
      </ProfileContent>
    );
  }

  return (
    <ProfileContent>
      <ProfileForm
        email={result.data.email}
        initialValues={toFormValues(result.data)}
      />
    </ProfileContent>
  );
}
