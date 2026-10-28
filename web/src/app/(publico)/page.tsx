import Image from "next/image";

export default function HomePage() {
  return (
    <main
      id="main-content"
      tabIndex={-1}
      className="flex flex-1 items-center justify-center px-6 py-16 sm:px-8"
    >
      <div className="max-w-lg text-center">
        <Image
          src="/logo.png"
          alt=""
          width={160}
          height={160}
          className="mx-auto mb-8"
        />
        <div aria-hidden="true" className="mx-auto mb-6 h-1 w-10 bg-brand" />
        <h1 className="font-heading text-3xl leading-tight font-semibold text-ink sm:text-4xl">
          Em construção
        </h1>
        <p className="mt-4 text-base leading-relaxed text-ink-muted">
          Estamos preparando nosso novo site.
        </p>
      </div>
    </main>
  );
}
