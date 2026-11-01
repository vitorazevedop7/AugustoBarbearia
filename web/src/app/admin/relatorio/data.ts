import "server-only";
import { createApiClient } from "@/lib/api/client";
import { apiMessage } from "../form-state";
import { loadUnavailableMessage, type FinancialReport } from "./report-state";

const TIMEOUT_MS = 8000;

/** Leitura da API: os dados, ou a mensagem para mostrar no lugar deles. */
export type Loaded<T> = { data: T } | { data?: undefined; message: string };

/** O relatório do período, decidido pela API (RN-01, RN-42, RN-43). */
export async function loadReport(period: {
  start: string;
  end: string;
  barberId?: number;
}): Promise<Loaded<FinancialReport>> {
  try {
    const result = await createApiClient().GET("/admin/reports/financial", {
      params: {
        query: {
          start: period.start,
          end: period.end,
          barber_id: period.barberId,
        },
      },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return result.data !== undefined
      ? { data: result.data }
      : { message: apiMessage(result.error, loadUnavailableMessage) };
  } catch {
    return { message: loadUnavailableMessage };
  }
}
