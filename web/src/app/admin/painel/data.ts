import "server-only";
import { createApiClient } from "@/lib/api/client";
import { apiMessage } from "../form-state";
import type { Loaded } from "../relatorio/data";
import { dashboardUnavailableMessage, type Dashboard } from "./dashboard-state";

const TIMEOUT_MS = 8000;

/** Os indicadores do painel, calculados pela API (RN-45). */
export async function loadDashboard(): Promise<Loaded<Dashboard>> {
  try {
    const result = await createApiClient().GET("/admin/dashboard", {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return result.data !== undefined
      ? { data: result.data }
      : { message: apiMessage(result.error, dashboardUnavailableMessage) };
  } catch {
    return { message: dashboardUnavailableMessage };
  }
}
