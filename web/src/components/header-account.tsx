import { SiteNav, type SiteLink } from "@/components/site-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { createApiClient } from "@/lib/api/client";
import { signInWithGoogle, signOut } from "@/lib/auth-actions";
import { getCurrentSession } from "@/lib/session";

type Role = "admin" | "customer";

/** `role` é o que a API diz (`GET /me`); `null` se ela não respondeu. */
export type HeaderUser = { name: string; role: Role | null };

/** As áreas de cada papel (RN-70, RN-71): o cliente e a administração. */
const accountLinks: Record<Role, SiteLink[]> = {
  customer: [
    { href: "/meus-agendamentos", label: "Meus agendamentos" },
    { href: "/perfil", label: "Perfil" },
  ],
  admin: [{ href: "/admin", label: "Administração" }],
};

/**
 * A parte do cabeçalho que depende do usuário. Fica num `Suspense` do
 * `SiteHeader`: a página não espera a sessão nem a API para chegar ao
 * navegador. Quem decide o papel é a API, não o web (RN-71).
 */
export async function HeaderAccount({
  stacked = false,
}: {
  stacked?: boolean;
}) {
  const session = await getCurrentSession();
  return (
    <Account
      user={
        session ? { name: session.user.name, role: await currentRole() } : null
      }
      stacked={stacked}
    />
  );
}

async function currentRole(): Promise<Role | null> {
  try {
    const me = await createApiClient().GET("/me", {
      signal: AbortSignal.timeout(5000),
    });
    return me.data?.role ?? null;
  } catch {
    return null;
  }
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

/**
 * Entrar com Google ou, para quem está logado, os links da área dele, o
 * primeiro nome e "Sair", sobre o cabeçalho escuro. No desktop, o nome sai da
 * linha para caber a navegação; no menu do celular, os links ficam em coluna,
 * como os da vitrine.
 */
export function Account({
  user,
  stacked = false,
}: {
  user: HeaderUser | null;
  stacked?: boolean;
}) {
  if (user) {
    const links = user.role ? accountLinks[user.role] : [];
    const signOutForm = (
      <form
        action={signOut}
        className={
          stacked
            ? "flex items-center justify-between gap-2"
            : "flex items-center gap-2"
        }
      >
        {stacked || links.length === 0 ? (
          <p className="max-w-30 truncate text-sm text-on-ink-muted">
            Olá, {firstName(user.name)}
          </p>
        ) : null}
        <Button type="submit" variant="ghost-light" size="sm" className="px-3">
          Sair
        </Button>
      </form>
    );
    if (links.length === 0) return signOutForm;
    return (
      <div
        className={stacked ? "flex flex-col gap-4" : "flex items-center gap-4"}
      >
        <SiteNav
          layout={stacked ? "column" : "row"}
          links={links}
          label="Sua conta"
        />
        {signOutForm}
      </div>
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
