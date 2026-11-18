import { Button } from "@/components/ui/button";
import { signInAsDemo } from "@/lib/auth-actions";
import type { DemoRole } from "@/lib/demo-mode";

const options: { role: DemoRole; label: string }[] = [
  { role: "admin", label: "Entrar como administração (demo)" },
  { role: "customer", label: "Entrar como cliente (demo)" },
];

/**
 * Entrada sem Google do modo demonstração (#199). Só aparece com a flag
 * ligada; quem decide é a página. Cada botão é um formulário com Server
 * Action, para funcionar sem JavaScript, como o "Entrar com Google".
 */
export function DemoSignIn({ destination }: { destination: string }) {
  return (
    <section
      aria-labelledby="demo-sign-in-title"
      className="mt-8 border-t border-line pt-6"
    >
      <h2
        id="demo-sign-in-title"
        className="font-heading text-lg font-normal text-ink"
      >
        Demonstração
      </h2>
      <p className="mt-2 text-sm text-ink-muted">
        Conheça o sistema sem conta Google, com dados fictícios.
      </p>
      <div className="mt-4 flex flex-col gap-3">
        {options.map(({ role, label }) => (
          <form key={role} action={signInAsDemo}>
            <input type="hidden" name="perfil" value={role} />
            <input type="hidden" name="voltar" value={destination} />
            <Button type="submit" variant="outline" className="w-full">
              {label}
            </Button>
          </form>
        ))}
      </div>
    </section>
  );
}
