"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { safeRedirectPath } from "@/lib/session";

/** Volta para o campo `voltar` do formulário ou, sem ele, para a página de onde veio o pedido. */
async function returnPath(formData: FormData): Promise<string> {
  const field = formData.get("voltar");
  if (typeof field === "string" && field !== "") return safeRedirectPath(field);
  const referer = (await headers()).get("referer");
  if (!referer) return "/";
  const url = new URL(referer);
  return safeRedirectPath(`${url.pathname}${url.search}`);
}

/** Server Action do botão "Entrar": leva ao consentimento do Google (funciona sem JS). */
export async function signInWithGoogle(formData: FormData) {
  const callbackURL = await returnPath(formData);
  const { url } = await auth.api.signInSocial({
    body: {
      provider: "google",
      callbackURL,
      errorCallbackURL: `/entrar?voltar=${encodeURIComponent(callbackURL)}`,
    },
  });
  if (!url) redirect(`/entrar?error=sem_url`);
  redirect(url);
}

/** Server Action do botão "Sair": encerra a sessão e fica na mesma página. */
export async function signOut(formData: FormData) {
  await auth.api.signOut({ headers: await headers() });
  redirect(await returnPath(formData));
}
