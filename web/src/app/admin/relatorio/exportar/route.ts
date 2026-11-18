import { createApiClient } from "@/lib/api/client";
import { fileResponse, unavailableResponse } from "@/lib/api/download";
import { todayInSaoPaulo } from "../../agenda/agenda-state";
import { parseReportParams } from "../report-state";

const TIMEOUT_MS = 15000;

/**
 * O CSV do relatório (RN-43): `GET /admin/relatorio/exportar?inicio=&fim=&barbeiro=`,
 * com os mesmos parâmetros da tela. A API valida o período, o barbeiro e o
 * papel de administração; aqui só se repassa o arquivo com o token do servidor.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const state = parseReportParams(params, todayInSaoPaulo());
  try {
    return fileResponse(
      await createApiClient().GET("/admin/reports/financial.csv", {
        params: {
          query: {
            start: state.inicio,
            end: state.fim,
            barber_id: state.barbeiro,
          },
        },
        parseAs: "arrayBuffer",
        signal: AbortSignal.timeout(TIMEOUT_MS),
      }),
    );
  } catch {
    return unavailableResponse();
  }
}
