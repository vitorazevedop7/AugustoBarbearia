import Image from "next/image";
import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-surface/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link
          href="/"
          aria-label="Augusto Barbearia — página inicial"
          className="flex items-center gap-3 transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
        >
          <Image src="/logo.png" alt="" width={48} height={48} preload />
          <span className="font-heading text-lg leading-tight font-bold text-ink sm:text-xl">
            Augusto Barbearia
          </span>
        </Link>
      </div>
    </header>
  );
}
