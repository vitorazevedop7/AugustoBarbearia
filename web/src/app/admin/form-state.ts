/** Resultado de uma Server Action de formulário. `values` repõe o que foi digitado. */
export type FormState = {
  status: "idle" | "success" | "error";
  message?: string;
  values?: Record<string, string>;
};

export const saveUnavailableMessage =
  "Não foi possível salvar agora. Tente novamente em instantes.";

export function formValues(formData: FormData): Record<string, string> {
  const values: Record<string, string> = {};
  formData.forEach((value, key) => {
    if (typeof value === "string" && !key.startsWith("$")) values[key] = value;
  });
  return values;
}

/** O `message` do erro da API (ADR 0008), ou `fallback` se a resposta não seguir o contrato. */
export function apiMessage(
  error: unknown,
  fallback: string = saveUnavailableMessage,
): string {
  if (typeof error === "object" && error !== null && "message" in error) {
    const { message } = error;
    if (typeof message === "string" && message) return message;
  }
  return fallback;
}

/** Estado de erro que devolve o formulário com o que foi digitado. */
export function failedState(formData: FormData, message: string): FormState {
  return { status: "error", message, values: formValues(formData) };
}
