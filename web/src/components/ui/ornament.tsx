/** Bigode entre duas linhas: a marca que fica acima dos títulos de seção. */
export function Ornament({
  align = "center",
  tone = "light",
}: {
  align?: "center" | "start";
  tone?: "light" | "dark";
}) {
  const color = tone === "dark" ? "text-brand-on-dark" : "text-brand";
  return (
    <div
      aria-hidden="true"
      className={`flex items-center gap-3 ${color} ${align === "center" ? "justify-center" : "justify-start"}`}
    >
      <span className="h-0.5 w-10 bg-current" />
      <svg viewBox="0 0 48 14" className="h-3.5 w-12" fill="currentColor">
        <path d="M24 5C21 2 16 1 12 3 8 5 5 9 1 8c2 4 8 5 13 3 4-1.5 7-3 10-3s6 1.5 10 3c5 2 11 1 13-3-4 1-7-3-11-5-4-2-9-1-12 2Z" />
      </svg>
      <span className="h-0.5 w-10 bg-current" />
    </div>
  );
}
