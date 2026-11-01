import "server-only";
import { createApiClient } from "@/lib/api/client";
import { apiMessage } from "../../form-state";
import type { Loaded } from "../data";
import { loadTimeBlocksMessage, type TimeBlock } from "./time-block-state";

const TIMEOUT_MS = 5000;

/** Os bloqueios do mesmo período e barbeiro da agenda (RN-03). */
export async function loadTimeBlocks(period: {
  start: string;
  end: string;
  barberId?: number;
}): Promise<Loaded<TimeBlock[]>> {
  try {
    const result = await createApiClient().GET("/admin/time-blocks", {
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
      : { message: loadTimeBlocksMessage };
  } catch {
    return { message: loadTimeBlocksMessage };
  }
}

/** Um bloqueio, para a confirmação de "Remover". */
export async function loadTimeBlock(id: number): Promise<Loaded<TimeBlock>> {
  try {
    const result = await createApiClient().GET(
      "/admin/time-blocks/{block_id}",
      {
        params: { path: { block_id: id } },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    return result.data !== undefined
      ? { data: result.data }
      : { message: apiMessage(result.error, loadTimeBlocksMessage) };
  } catch {
    return { message: loadTimeBlocksMessage };
  }
}
