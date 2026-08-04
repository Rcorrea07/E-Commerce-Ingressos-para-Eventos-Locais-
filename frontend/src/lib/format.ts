export function formatMoney(valueCents: number, currency = "BRL") {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(valueCents / 100);
}

export function formatDateTime(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Sao_Paulo",
    ...options,
  }).format(new Date(value));
}

export function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  }).format(new Date(value));
}

export function formatAddress(input: {
  venueName?: string;
  street?: string;
  number?: string;
  city: string;
  state: string;
}) {
  const place = [input.venueName, input.street && `${input.street}${input.number ? `, ${input.number}` : ""}`]
    .filter(Boolean)
    .join(" · ");
  return `${place}${place ? " · " : ""}${input.city}, ${input.state}`;
}

export function formatDuration(seconds: number) {
  const safe = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainder).padStart(2, "0")}`;
}
