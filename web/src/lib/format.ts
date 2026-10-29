/** Telefone guardado só com dígitos (DDD + número) → "(75) 99999-0000". */
export function formatPhone(digits: string): string {
  const match = /^(\d{2})(\d{4,5})(\d{4})$/.exec(digits);
  return match ? `(${match[1]}) ${match[2]}-${match[3]}` : digits;
}

/** Hora da API ("10:00:00") no formato do campo `type="time"` ("10:00"). */
export function toTimeInput(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

const currency = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

/**
 * Preço da API, uma string decimal ("25.00"), em reais ("R$ 25,00").
 * O `Intl` formata a string sem convertê-la em `number`: nada passa por float.
 */
export function formatPrice(value: string): string {
  return currency.format(value as Intl.StringNumericLiteral);
}

/** Preço da API ("1234.50") no formato em que a pessoa digita ("1234,50"). */
export function toPriceInput(value: string | null | undefined): string {
  return value ? value.replace(".", ",") : "";
}

/** Duração em minutos: "50 min", "1h" ou "1h 30min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${minutes} min`;
  return rest === 0 ? `${hours}h` : `${hours}h ${rest}min`;
}

const conjunction = new Intl.ListFormat("pt-BR", {
  style: "long",
  type: "conjunction",
});

/** Lista de nomes em português: "Edvaldo, Lauro e Manoel". */
export function formatList(items: string[]): string {
  return conjunction.format(items);
}
