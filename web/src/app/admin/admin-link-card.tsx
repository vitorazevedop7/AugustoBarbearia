import Link from "next/link";

/** Atalho para uma área da administração: o card inteiro é o link. */
export function AdminLinkCard({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group block h-full bg-surface p-6 shadow-card transition-transform duration-300 ease-out hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand motion-reduce:transition-none motion-reduce:hover:translate-y-0"
    >
      <span className="flex items-center justify-between gap-4 font-semibold text-ink">
        {title}
        <svg
          aria-hidden="true"
          viewBox="0 0 24 24"
          className="size-5 shrink-0 text-brand"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M5 12h14m-6-6 6 6-6 6" />
        </svg>
      </span>
      <span className="mt-2 block text-sm text-ink-muted">{description}</span>
    </Link>
  );
}
