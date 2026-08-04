"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { loadStripe } from "@stripe/stripe-js";
import { Check, ChevronLeft, Clock3, LoaderCircle, LockKeyhole } from "lucide-react";
import { toast } from "sonner";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { api } from "@/lib/api/client";
import { asProblem, problemMessage } from "@/lib/api/problem";
import type { Checkout, PaymentSession } from "@/lib/api/types";
import { formatDateTime, formatDuration, formatMoney } from "@/lib/format";
import { checkoutStatusLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function CheckoutExperience({ checkoutId }: { checkoutId: string }) {
  const router = useRouter();
  const [checkout, setCheckout] = useState<Checkout>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [remaining, setRemaining] = useState(0);
  const [paymentSession, setPaymentSession] = useState<PaymentSession>();
  const [paymentLoading, setPaymentLoading] = useState(true);
  const [paymentError, setPaymentError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const serverOffset = useRef(0);
  const confirmed = useRef(false);
  const paymentInProgress = useRef(false);
  const paymentSessionKey = useRef<string | undefined>(undefined);
  const confirmKey = useRef<string | undefined>(undefined);

  const syncClock = useCallback((data: Checkout) => {
    serverOffset.current = Date.parse(data.serverTime) - Date.now();
    setRemaining(Math.max(0, Math.ceil((Date.parse(data.expiresAt) - (Date.now() + serverOffset.current)) / 1000)));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/api/v1/checkouts/{id}", { params: { path: { id: checkoutId } } });
    if (apiError) setError(problemMessage(apiError, "Esta reserva não está mais disponível."));
    if (data) { setCheckout(data); syncClock(data); if (data.status !== "ACTIVE") setPaymentLoading(false); }
    setLoading(false);
  }, [checkoutId, syncClock]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  useEffect(() => {
    if (!checkout || checkout.status !== "ACTIVE") return;
    let stopped = false;
    paymentSessionKey.current ??= crypto.randomUUID();
    void api.POST("/api/v1/checkouts/{id}/payment-session", {
      params: { path: { id: checkout.id }, header: { "idempotency-key": paymentSessionKey.current } },
    }).then(({ data, error: apiError }) => {
      if (stopped) return;
      if (data) setPaymentSession(data);
      else setPaymentError(problemMessage(apiError, "Não foi possível preparar o pagamento."));
      setPaymentLoading(false);
    });
    return () => { stopped = true; };
  }, [checkout]);

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
      if (confirmed.current || paymentInProgress.current) return;
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

  const confirm = useCallback(async () => {
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
  }, [checkout, router]);

  useEffect(() => {
    const paidInStripe = paymentSession?.provider === "STRIPE_TEST" && paymentSession.status === "SUCCEEDED";
    if ((checkout?.status === "CONFIRMED" || paidInStripe) && !confirmed.current) void confirm();
  }, [checkout?.status, confirm, paymentSession?.provider, paymentSession?.status]);

  const stripePromise = useMemo(
    () => paymentSession?.provider === "STRIPE_TEST" && paymentSession.publishableKey ? loadStripe(paymentSession.publishableKey) : null,
    [paymentSession],
  );

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

        {(error || terminal) && <Alert variant="destructive" role="alert" className="mb-6"><AlertTitle>Reserva encerrada</AlertTitle><AlertDescription>{error ?? `Status atual: ${checkoutStatusLabels[checkout.status]}`}</AlertDescription></Alert>}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Checkout temporário</p>
              <h1 className="mt-2 text-3xl font-semibold tracking-[-0.045em] text-white">Finalize sua experiência</h1>
              {checkout.event && <p className="mt-2 text-sm text-muted-foreground">{checkout.event.title} · {formatDateTime(checkout.event.startsAt)}</p>}
            </div>

            <Card>
              <CardHeader><CardTitle className="text-base">Pagamento com cartão</CardTitle></CardHeader>
              <CardContent>
                {paymentLoading ? (
                  <div className="flex min-h-28 items-center justify-center gap-2 text-sm text-muted-foreground"><LoaderCircle className="size-4 animate-spin" /> Preparando pagamento...</div>
                ) : paymentError ? (
                  <Alert variant="destructive" role="alert"><AlertDescription>{paymentError}</AlertDescription></Alert>
                ) : paymentSession?.provider === "STRIPE_TEST" && paymentSession.clientSecret && stripePromise ? (
                  <Elements
                    stripe={stripePromise}
                    options={{
                      clientSecret: paymentSession.clientSecret,
                      locale: "pt-BR",
                      appearance: {
                        theme: "night",
                        variables: {
                          colorPrimary: "#67e8f9",
                          colorBackground: "#090c12",
                          colorText: "#f8fafc",
                          colorDanger: "#fb7185",
                          borderRadius: "12px",
                        },
                      },
                    }}
                  >
                    <StripePaymentForm
                      totalCents={checkout.totalCents}
                      disabled={busy || Boolean(error) || Boolean(terminal) || remaining === 0}
                      onPaid={confirm}
                      onProgress={(value) => { paymentInProgress.current = value; setBusy(value); }}
                    />
                  </Elements>
                ) : paymentSession ? (
                  <div>
                    <p className="text-sm leading-6 text-muted-foreground">{paymentSession.provider === "FREE" ? "Este ingresso não exige pagamento." : "O gateway Stripe não está habilitado neste ambiente local."}</p>
                    <Button className="mt-5 h-11 w-full" onClick={confirm} disabled={busy || Boolean(error) || terminal || remaining === 0}>{busy ? <><LoaderCircle className="animate-spin" /> Processando...</> : <>Confirmar reserva <Check /></>}</Button>
                  </div>
                ) : null}
              </CardContent>
            </Card>

          </div>

          <Card className="h-fit bg-card/88">
            <CardHeader><CardTitle className="text-base">Resumo do pedido</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {checkout.items.map((item) => <div key={item.ticketTypeId} className="flex justify-between gap-4 text-sm"><div><p className="text-white">{item.quantity}× {item.ticketTypeName}</p><p className="mt-1 text-xs text-muted-foreground">{formatMoney(item.unitPriceCents)} cada</p></div><span>{formatMoney(item.quantity * item.unitPriceCents)}</span></div>)}
              </div>
              <div className="mt-6 flex items-end justify-between border-t border-white/8 pt-5"><span className="text-sm text-muted-foreground">Total</span><strong className="text-2xl tracking-[-0.04em] text-primary">{formatMoney(checkout.totalCents)}</strong></div>
              <Button variant="ghost" className="mt-5 w-full text-muted-foreground" onClick={cancel} disabled={busy || terminal}>Cancelar e liberar ingressos</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}

function StripePaymentForm({ totalCents, disabled, onPaid, onProgress }: { totalCents: number; disabled: boolean; onPaid: () => Promise<void>; onProgress: (value: boolean) => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [message, setMessage] = useState<string>();

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements || disabled) return;
    setMessage(undefined);
    onProgress(true);
    const result = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: window.location.href },
      redirect: "if_required",
    });
    if (result.error) {
      setMessage(result.error.message ?? "Não foi possível confirmar o pagamento de teste.");
      onProgress(false);
      return;
    }
    if (result.paymentIntent.status !== "succeeded") {
      setMessage("O pagamento ainda está sendo processado. Aguarde alguns instantes.");
      onProgress(false);
      return;
    }
    try {
      await onPaid();
    } finally {
      onProgress(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <PaymentElement />
      {message && <p className="mt-4 text-sm text-destructive" role="alert">{message}</p>}
      <p className="mt-4 text-xs text-muted-foreground">Para testar, use o cartão 4242 4242 4242 4242, uma data futura e qualquer CVC.</p>
      <Button type="submit" className="mt-5 h-11 w-full" disabled={!stripe || !elements || disabled}>{disabled ? <><LoaderCircle className="animate-spin" /> Processando...</> : <>Pagar {formatMoney(totalCents)} <Check /></>}</Button>
    </form>
  );
}
