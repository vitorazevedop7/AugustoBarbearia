import { createApiClient } from "@/lib/api/client";

type Status = { tone: "ok" | "error" | "pending"; label: string };

const toneClass = {
  ok: "text-success",
  error: "text-danger",
  pending: "text-ink-muted",
} as const;

/** Faixa discreta com o status da API. A página só a mostra em desenvolvimento. */
export function ApiStatusBar({ tone, label }: Status) {
  return (
    <p
      role="status"
      className="border-t border-line bg-paper px-4 py-2 text-center text-xs text-ink-muted"
    >
      API: <span className={`font-semibold ${toneClass[tone]}`}>{label}</span>
    </p>
  );
}

/** Prova de vida do contrato (#29): `GET /health` pelo cliente tipado. */
export async function ApiStatus() {
  return <ApiStatusBar {...await readApiStatus()} />;
}

async function readApiStatus(): Promise<Status> {
  try {
    const { data, error, response } = await createApiClient().GET("/health", {
      signal: AbortSignal.timeout(3000),
    });
    if (!data) {
      // Corpo fora do contrato (ex.: 502 em texto) chega como string ou vazio.
      const message = typeof error === "object" ? error?.message : undefined;
      return { tone: "error", label: message || `HTTP ${response.status}` };
    }
    return { tone: "ok", label: data.status };
  } catch {
    return { tone: "error", label: "inacessível" };
  }
}
