import "server-only";

export const downloadUnavailableMessage =
  "Não foi possível gerar o arquivo agora. Tente novamente em instantes.";

type Result = {
  data?: unknown;
  error?: unknown;
  response: Response;
};

function message(error: unknown): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message: text } = error;
    if (typeof text === "string" && text) return text;
  }
  return downloadUnavailableMessage;
}

/**
 * Repassa ao navegador um arquivo que a API gerou (CSV, `.ics`), pelo Route
 * Handler: o navegador nunca chama a API (ADR 0003). `result` vem do cliente
 * tipado com `parseAs: "arrayBuffer"`, que mantém os bytes (o BOM do CSV
 * inclusive). O tipo e o nome do arquivo são os da API.
 *
 * Quando a API recusa, a resposta é o `message` dela em texto simples e com o
 * mesmo status: quem clicou num link de download vê o motivo, não um JSON.
 */
export function fileResponse(result: Result): Response {
  const { data, error, response } = result;
  if (error === undefined && data !== undefined) {
    const headers = new Headers({
      "Content-Type":
        response.headers.get("Content-Type") ?? "application/octet-stream",
      // Dados pessoais: nada de cache compartilhado.
      "Cache-Control": "private, no-store",
    });
    const disposition = response.headers.get("Content-Disposition");
    if (disposition) headers.set("Content-Disposition", disposition);
    return new Response(data as ArrayBuffer, { status: 200, headers });
  }
  return new Response(message(error), {
    status: response.status >= 400 ? response.status : 502,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}

/** O arquivo não saiu: a API não respondeu a tempo ou caiu. */
export function unavailableResponse(): Response {
  return new Response(downloadUnavailableMessage, {
    status: 502,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "private, no-store",
    },
  });
}
