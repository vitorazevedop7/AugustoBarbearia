import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Ornament } from "@/components/ui/ornament";
import { signInWithGoogle } from "@/lib/auth-actions";
import { getCurrentSession, safeRedirectPath } from "@/lib/session";

export const metadata: Metadata = {
  title: "Entrar — Augusto Barbearia",
  robots: { index: false },
};

/** Página de login. Também recebe quem volta do Google com erro (`?error=`). */
export default async function SignInPage({
  searchParams,
}: PageProps<"/entrar">) {
  const { voltar, error } = await searchParams;
  const destination = safeRedirectPath(voltar);
  if (await getCurrentSession()) redirect(destination);

  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center px-4 py-16 sm:px-6 lg:py-24"
    >
      <div className="mx-auto w-full max-w-md bg-surface p-6 text-center shadow-card sm:p-10">
        <Ornament />
        <h1 className="mt-6 font-heading text-display-3 font-bold text-ink">
          Entrar
        </h1>
        <p className="mt-3 text-ink-muted">
          Use a sua conta Google para agendar e acompanhar seus horários. Não
          precisa criar senha.
        </p>
        {error ? (
          <div className="mt-6 text-left">
            <Alert
              tone="danger"
              title="Não foi possível entrar com o Google. Tente de novo."
            />
          </div>
        ) : null}
        <form action={signInWithGoogle} className="mt-8">
          <input type="hidden" name="voltar" value={destination} />
          <Button type="submit" className="w-full">
            Entrar com Google
          </Button>
        </form>
        <p className="mt-6 text-sm text-ink-muted">
          Do Google recebemos só o seu nome, e-mail e foto, usados apenas para o
          seu atendimento.
        </p>
      </div>
    </main>
  );
}
