import { connection } from "next/server";
import { isDemoLoginEnabled } from "@/lib/demo-mode";

/**
 * Faixa do modo demonstração (#199), no topo do cabeçalho de todas as
 * páginas. Fica dentro do cabeçalho, que é escuro (ou transparente sobre o
 * hero escuro), e ocupa a largura toda. A flag é lida na requisição
 * (`connection`), e não no build: a mesma imagem serve à demonstração e à
 * produção.
 */
export async function DemoBanner() {
  await connection();
  if (!isDemoLoginEnabled()) return null;
  return (
    <p
      role="note"
      className="-mx-4 border-b border-line-on-ink px-4 py-1.5 text-center text-xs font-medium text-on-ink-muted sm:-mx-6 lg:-mx-8"
    >
      Ambiente de demonstração — dados fictícios
    </p>
  );
}
