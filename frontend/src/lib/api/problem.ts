import type { ProblemDetails } from "@/lib/api/types";

export function asProblem(error: unknown): ProblemDetails | null {
  if (!error || typeof error !== "object") return null;
  const candidate = error as Partial<ProblemDetails>;
  if (typeof candidate.code !== "string" || typeof candidate.detail !== "string") return null;
  return candidate as ProblemDetails;
}

export function problemMessage(error: unknown, fallback = "Não foi possível concluir esta ação.") {
  const problem = asProblem(error);
  return problem?.detail ?? fallback;
}

export function fieldErrors(error: unknown) {
  const problem = asProblem(error);
  if (!Array.isArray(problem?.errors)) return [];
  return problem.errors as Array<{ path?: string[]; message?: string }>;
}
