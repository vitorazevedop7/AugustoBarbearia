/** Telefone guardado só com dígitos (DDD + número) → "(75) 99999-0000". */
export function formatPhone(digits: string): string {
  const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

/** Hora da API ("10:00:00") no formato do campo `type="time"` ("10:00"). */
export function toTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}
