import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signInWithGoogle, signOut } from "@/lib/auth-actions";

export type HeaderUser = { name: string };

/** Cabeçalho fixo. Recebe o usuário logado do layout (ou `null`). */
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
        {user ? (
          <form action={signOut} className="flex shrink-0 items-center gap-2">
            <p className="hidden max-w-40 truncate text-sm text-ink-muted sm:block">
              Olá, {firstName(user.name)}
            </p>
            <Button type="submit" variant="ghost" size="sm" className="px-3">
              Sair
            </Button>
          </form>
        ) : (
          <form action={signInWithGoogle} className="shrink-0">
            <Button
              type="submit"
              variant="outline"
              size="sm"
              aria-label="Entrar com Google"
            >
              <span className="sm:hidden">Entrar</span>
              <span className="hidden sm:inline">Entrar com Google</span>
            </Button>
          </form>
        )}
      </div>
    </header>
  );
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || name;
}
