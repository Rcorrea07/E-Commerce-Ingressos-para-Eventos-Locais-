import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StatePanel({
  kind,
  title,
  description,
  action,
  icon: Icon,
}: {
  kind: "loading" | "empty" | "error";
  title?: string;
  description?: string;
  action?: { label: string; onClick: () => void };
  icon?: LucideIcon;
}) {
  const DefaultIcon = kind === "loading" ? LoaderCircle : kind === "error" ? AlertCircle : Inbox;
  const PanelIcon = Icon ?? DefaultIcon;
  return (
    <div
      role={kind === "loading" ? "status" : kind === "error" ? "alert" : undefined}
      className="flex min-h-64 flex-col items-center justify-center rounded-2xl border border-dashed border-white/12 bg-card/45 px-6 py-12 text-center"
    >
      <span className="mb-4 grid size-12 place-items-center rounded-2xl bg-white/5 text-muted-foreground">
        <PanelIcon className={kind === "loading" ? "size-5 animate-spin" : "size-5"} />
      </span>
      <h2 className="font-medium text-white">{title ?? (kind === "loading" ? "Carregando" : kind === "error" ? "Não foi possível carregar" : "Nada por aqui ainda")}</h2>
      {description && <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>}
      {action && <Button variant="outline" className="mt-5" onClick={action.onClick}>{action.label}</Button>}
    </div>
  );
}
