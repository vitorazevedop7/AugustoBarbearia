import Image from "next/image";
import Link from "next/link";
import { SiteNav } from "@/components/site-nav";
import { Button, ButtonLink } from "@/components/ui/button";
import { MobileMenu } from "@/components/ui/mobile-menu";
import { signInWithGoogle, signOut } from "@/lib/auth-actions";
import { BOOKING_PATH } from "@/lib/booking";

export type HeaderUser = { name: string };

/**
 * Cabeçalho fixo, com a navegação da vitrine e a chamada para agendar.
 * No desktop fica tudo numa linha; no celular, num menu. Recebe o usuário
 * logado do layout (ou `null`).
 */
export function SiteHeader({ user }: { user: HeaderUser | null }) {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Augusto Barbearia — página inicial"
          className="flex min-w-0 items-center gap-3 transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Image src="/logo.png" alt="" width={48} height={48} preload />
          <span className="font-heading text-lg leading-tight font-bold text-ink sm:text-xl">
            Augusto Barbearia
          </span>
        </Link>

        <div className="hidden items-center gap-8 lg:flex">
          <SiteNav layout="row" />
          <div className="flex items-center gap-3">
            <Account user={user} />
            <ButtonLink href={BOOKING_PATH} size="sm">
              Agendar
            </ButtonLink>
          </div>
        </div>

        <MobileMenu>
          <div className="px-4 pt-2 pb-6 sm:px-6">
            <SiteNav layout="column" />
            <ButtonLink href={BOOKING_PATH} className="mt-6 w-full">
              Agendar horário
            </ButtonLink>
            <div className="mt-4">
              <Account user={user} stacked />
            </div>
          </div>
        </MobileMenu>
      </div>
    </header>
  );
}

/** Entrar com Google ou, para quem está logado, o primeiro nome e "Sair". */
function Account({
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
        <p className="max-w-40 truncate text-sm text-ink-muted">
          Olá, {firstName(user.name)}
        </p>
        <Button type="submit" variant="ghost" size="sm" className="px-3">
          Sair
        </Button>
      </form>
    );
  }
  return (
    <form action={signInWithGoogle}>
      <Button
        type="submit"
        variant="outline"
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
