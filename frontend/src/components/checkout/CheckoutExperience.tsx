"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Banknote, Check, ChevronLeft, Clock3, CreditCard, LoaderCircle, LockKeyhole, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api/client";
import { asProblem, problemMessage } from "@/lib/api/problem";
import type { Checkout } from "@/lib/api/types";
import { formatDateTime, formatDuration, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

export function CheckoutExperience({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<Checkout>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [remaining, setRemaining] = useState(0);
  const [payment, setPayment] = useState<"pix" | "card">("pix");
  const [busy, setBusy] = useState(false);
  const serverOffset = useRef(0);
  const confirmed = useRef(false);
  const confirmKey = useRef<string | undefined>(undefined);

  const syncClock = useCallback((data: Checkout) => {
    serverOffset.current = Date.parse(data.serverTime) - Date.now();
    setRemaining(Math.max(0, Math.ceil((Date.parse(data.expiresAt) - (Date.now() + serverOffset.current)) / 1000)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/api/v1/checkouts/{id}", { params: { path: { id: checkoutId } } });
    if (apiError) setError(problemMessage(apiError, "Esta reserva não está mais disponível."));
    if (data) { setCheckout(data); syncClock(data); }
    setLoading(false);
  }, [checkoutId, syncClock]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    if (!checkout || checkout.status !== "ACTIVE") return;
    const interval = window.setInterval(() => {
      const value = Math.max(0, Math.ceil((Date.parse(checkout.expiresAt) - (Date.now() + serverOffset.current)) / 1000));
      setRemaining(value);
      if (value === 0) setError("O tempo da reserva terminou. Os ingressos voltaram a ficar disponíveis.");
    }, 1000);
    return () => window.clearInterval(interval);
  }, [checkout]);

  useEffect(() => {
    if (!checkout || checkout.status !== "ACTIVE") return;
    const activeCheckoutId = checkout.id;
    let stopped = false;
    async function heartbeat() {
      const { data, error: apiError, response } = await api.POST("/api/v1/checkouts/{id}/heartbeat", { params: { path: { id: activeCheckoutId } } });
      if (stopped) return;
      if (response.status === 410 || asProblem(apiError)?.status === 410) {
        stopped = true;
        setError("Esta reserva não pode mais ser reativada.");
      } else if (data) {
        serverOffset.current = Date.parse(data.serverTime) - Date.now();
      }
    }
    void heartbeat();
    const interval = window.setInterval(heartbeat, 15_000);
    return () => { stopped = true; window.clearInterval(interval); };
  }, [checkout]);

  useEffect(() => {
    if (!checkout || checkout.status !== "ACTIVE") return;
    const activeCheckoutId = checkout.id;
    const cancelOnExit = () => {
      if (confirmed.current) return;
      void fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001"}/api/v1/checkouts/${activeCheckoutId}/cancel`, {
        method: "POST", credentials: "include", keepalive: true,
      });
    };
    window.addEventListener("pagehide", cancelOnExit);
    return () => window.removeEventListener("pagehide", cancelOnExit);
  }, [checkout]);

  async function cancel() {
    if (!checkout) return;
    setBusy(true);
    const { error: apiError } = await api.POST("/api/v1/checkouts/{id}/cancel", { params: { path: { id: checkout.id } } });
    if (apiError) toast.error(problemMessage(apiError));
    else router.replace(checkout.event?.slug ? `/eventos/${checkout.event.slug}` : "/");
    setBusy(false);
  }

  async function confirm() {
    if (!checkout) return;
    setBusy(true);
    confirmKey.current ??= crypto.randomUUID();
    const { data, error: apiError } = await api.POST("/api/v1/checkouts/{id}/confirm", {
      params: { path: { id: checkout.id }, header: { "idempotency-key": confirmKey.current } },
    });
    if (data) {
      confirmed.current = true;
      router.replace(`/pedidos/${data.id}?confirmed=1`);
      return;
    }
    toast.error(problemMessage(apiError, "Não foi possível confirmar a reserva."));
    setBusy(false);
  }

  const totalWindow = checkout ? Math.max(1, Math.round((Date.parse(checkout.expiresAt) - Date.parse(checkout.createdAt)) / 1000)) : 900;
  const progress = Math.min(100, Math.max(0, (remaining / totalWindow) * 100));
  const terminal = checkout && checkout.status !== "ACTIVE";

  if (loading) return <main className="content-grid py-12"><StatePanel kind="loading" description="Confirmando sua reserva segura." /></main>;
  if (!checkout) return <main className="content-grid py-12"><StatePanel kind="error" title="Reserva indisponível" description={error} action={{ label: "Explorar eventos", onClick: () => router.push("/") }} /></main>;

  return (
    <main className="content-grid py-8 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Button variant="ghost" asChild className="-ml-3 text-muted-foreground"><Link href={checkout.event?.slug ? `/eventos/${checkout.event.slug}` : "/"}><ChevronLeft /> Voltar</Link></Button>
          <Badge variant="outline"><LockKeyhole /> Checkout seguro</Badge>
        </div>

        <div className="mb-6 overflow-hidden rounded-2xl border border-primary/15 bg-primary/6 p-4">
          <div className="flex items-center justify-between gap-4 text-sm">
            <div className="flex items-center gap-2 text-white"><Clock3 className="size-4 text-primary" /><span>Ingressos reservados para você</span></div>
            <strong className={cn("font-mono text-lg", remaining < 120 ? "text-destructive" : "text-primary")}>{formatDuration(remaining)}</strong>
          </div>
          <Progress value={progress} className="mt-3 h-1.5" />
        </div>

        {(error || terminal) && <Alert variant="destructive" className="mb-6"><AlertTitle>Reserva encerrada</AlertTitle><AlertDescription>{error ?? `Status atual: ${checkout.status}`}</AlertDescription></Alert>}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Checkout temporário</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-white">Finalize sua experiência</h1>
              {checkout.event && <p className="mt-2 text-sm text-muted-foreground">{checkout.event.title} · {formatDateTime(checkout.event.startsAt)}</p>}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Forma de pagamento simulada</CardTitle></CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <PaymentOption selected={payment === "pix"} onClick={() => setPayment("pix")} icon={Banknote} title="Pix" description="Confirmação imediata" />
                <PaymentOption selected={payment === "card"} onClick={() => setPayment("card")} icon={CreditCard} title="Cartão" description="Ambiente de demonstração" />
              </CardContent>
            </Card>

            <Alert className="border-cyan-300/15 bg-cyan-300/5"><ShieldCheck className="text-cyan-300" /><AlertTitle>Pagamento do MVP é simulado</AlertTitle><AlertDescription>Nenhuma cobrança real será feita. Ao confirmar, os ingressos serão emitidos imediatamente.</AlertDescription></Alert>
          </div>

          <Card className="h-fit bg-card/88">
            <CardHeader><CardTitle className="text-base">Resumo do pedido</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkout.items.map((item) => <div key={item.ticketTypeId} className="flex justify-between gap-4 text-sm"><div><p className="text-white">{item.quantity}× {item.ticketTypeName}</p><p className="mt-1 text-xs text-muted-foreground">{formatMoney(item.unitPriceCents)} cada</p></div><span>{formatMoney(item.quantity * item.unitPriceCents)}</span></div>)}
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-white/8 pt-5"><span className="text-sm text-muted-foreground">Total</span><strong className="text-2xl tracking-[-0.04em] text-primary">{formatMoney(checkout.totalCents)}</strong></div>
              <Button className="mt-6 h-11 w-full" onClick={confirm} disabled={busy || Boolean(error) || terminal || remaining === 0}>{busy ? <><LoaderCircle className="animate-spin" /> Processando...</> : <>Confirmar reserva <Check /></>}</Button>
              <Button variant="ghost" className="mt-2 w-full text-muted-foreground" onClick={cancel} disabled={busy || terminal}>Cancelar e liberar ingressos</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function PaymentOption({ selected, onClick, icon: Icon, title, description }: { selected: boolean; onClick: () => void; icon: typeof Banknote; title: string; description: string }) {
  return <button type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-xl border p-4 text-left transition", selected ? "border-primary/55 bg-primary/8" : "border-white/8 bg-black/10 hover:border-white/18")}><span className={cn("grid size-10 place-items-center rounded-xl", selected ? "bg-primary text-primary-foreground" : "bg-white/5 text-muted-foreground")}><Icon className="size-4" /></span><span><strong className="block text-sm text-white">{title}</strong><small className="text-xs text-muted-foreground">{description}</small></span>{selected && <Check className="ml-auto size-4 text-primary" />}</button>;
}
