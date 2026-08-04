export type CepAddress = {
  street: string;
  district: string;
  city: string;
  state: string;
};

type ViaCepResponse = {
  logradouro?: unknown;
  bairro?: unknown;
  localidade?: unknown;
  uf?: unknown;
  erro?: unknown;
};

export function normalizeCep(value: string) {
  return value.replace(/\D/g, "").slice(0, 8);
}

export function formatCep(value: string) {
  const normalized = normalizeCep(value);
  return normalized.length > 5 ? `${normalized.slice(0, 5)}-${normalized.slice(5)}` : normalized;
}

export async function lookupCep(value: string, signal?: AbortSignal): Promise<CepAddress | null> {
  const normalized = normalizeCep(value);
  if (normalized.length !== 8) throw new Error("CEP_INVALID");

  const response = await fetch(`https://viacep.com.br/ws/${normalized}/json/`, {
    signal,
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error("CEP_UNAVAILABLE");

  const result = (await response.json()) as ViaCepResponse;
  if (result.erro === true) return null;

  const city = typeof result.localidade === "string" ? result.localidade.trim() : "";
  const state = typeof result.uf === "string" ? result.uf.trim().toUpperCase() : "";
  if (!city || state.length !== 2) throw new Error("CEP_INVALID_RESPONSE");

  return {
    street: typeof result.logradouro === "string" ? result.logradouro.trim() : "",
    district: typeof result.bairro === "string" ? result.bairro.trim() : "",
    city,
    state,
  };
}
