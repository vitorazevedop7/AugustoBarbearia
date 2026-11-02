import { Button, ButtonLink } from "@/components/ui/button";
import { signInWithGoogle, signOut } from "@/lib/auth-actions";
import { getCurrentSession } from "@/lib/session";

export type HeaderUser = { name: string };

/**
 * A parte do cabeçalho que depende do usuário. Fica num `Suspense` do
 * `SiteHeader`: a página não espera a sessão para chegar ao navegador.
 */
export async function HeaderAccount({
  stacked = false,
}: {
  stacked?: boolean;
}) {
  const session = await getCurrentSession();
  return (
    <Account
      user={session ? { name: session.user.name } : null}
      stacked={stacked}
    />
  );
}

/** Mantém o login disponível sem JS enquanto a sessão chega por streaming. */
export function AccountPlaceholder({ stacked = false }: { stacked?: boolean }) {
  return (
    <ButtonLink
      href="/entrar"
      variant="outline-light"
      size="sm"
      className={stacked ? "w-full" : ""}
    >
      Entrar
    </ButtonLink>
  );
}

/** Entrar com Google ou, para quem está logado, o primeiro nome e "Sair", sobre o cabeçalho escuro. */
export function Account({
  user,
  stacked = false,
}: {
  user: HeaderUser | null;
  stacked?: boolean;
}) {
  if (user) {
    return (
      <form
        action={signOut}
        className={
          stacked
            ? "flex items-center justify-between gap-2"
            : "flex items-center gap-2"
        }
      >
        <p className="max-w-30 truncate text-sm text-on-ink-muted">
          Olá, {firstName(user.name)}
        </p>
        <Button type="submit" variant="ghost-light" size="sm" className="px-3">
          Sair
        </Button>
      </form>
    );
  }
  return (
    <form action={signInWithGoogle}>
      <Button
        type="submit"
        variant="outline-light"
        size="sm"
        className={stacked ? "w-full" : ""}
      >
        Entrar com Google
      </Button>
    </form>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
