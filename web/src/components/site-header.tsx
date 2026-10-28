import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="border-b border-line bg-surface">
      <div className="mx-auto flex max-w-6xl px-6 py-4 sm:px-8">
        <Link
          href="/"
          aria-label="Augusto Barbearia — página inicial"
          className="flex items-center gap-3 rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none"
        >
          <Image src="/logo.png" alt="" width={64} height={64} preload />
          <span className="font-heading text-xl leading-tight font-semibold text-ink sm:text-2xl">
            Augusto
            <br />
            Barbearia
          </span>
        </Link>
      </div>
    </header>
  );
}
