"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CalendarCheck2, CheckCircle2, ChevronLeft, MapPin, PartyPopper, Ticket as TicketIcon } from "lucide-react";
import { toast } from "sonner";
import { OrderStatus } from "@/components/orders/OrdersExperience";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Order } from "@/lib/api/types";
import { formatDateTime, formatMoney } from "@/lib/format";

export function OrderDetails({ orderId }: { orderId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [order, setOrder] = useState<Order>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [openedAt] = useState(() => Date.now());
  const cancelKey = useRef<string | undefined>(undefined);
  const confirmedNow = searchParams.get("confirmed") === "1";
  const load = useCallback(async () => { setLoading(true); const { data, error: apiError } = await api.GET("/api/v1/orders/{id}", { params: { path: { id: orderId } } }); if (apiError) setError(problemMessage(apiError)); setOrder(data); setLoading(false); }, [orderId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function cancel() {
    if (!order) return;
    setBusy(true); cancelKey.current ??= crypto.randomUUID();
    const { data, error: apiError } = await api.POST("/api/v1/orders/{id}/cancel", { params: { path: { id: order.id }, header: { "idempotency-key": cancelKey.current } } });
    if (apiError) toast.error(problemMessage(apiError, "Este pedido não pode ser cancelado.")); else { setOrder(data); toast.success("Pedido cancelado e ingressos invalidados."); }
    setBusy(false);
  }

  if (loading) return <main className="content-grid py-12"><StatePanel kind="loading" /></main>;
  if (!order) return <main className="content-grid py-12"><StatePanel kind="error" description={error} action={{ label: "Voltar aos pedidos", onClick: () => router.push("/pedidos") }} /></main>;
  const hasUsed = order.items.some((item) => item.tickets.some((ticket) => ticket.status === "USED"));
  const beforeDeadline = Date.parse(order.event.startsAt) - openedAt > 48 * 60 * 60 * 1000;
  const canCancel = order.status === "CONFIRMED" && beforeDeadline && !hasUsed;

  return (
    <main className="content-grid py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Button variant="ghost" asChild className="mb-6 -ml-3 text-muted-foreground"><Link href="/pedidos"><ChevronLeft /> Meus pedidos</Link></Button>
        {confirmedNow && <div className="relative mb-8 overflow-hidden rounded-3xl border border-cyan-300/18 bg-cyan-300/7 px-6 py-10 text-center"><div className="absolute inset-0 brand-grid opacity-30" /><span className="relative mx-auto grid size-14 place-items-center rounded-2xl bg-cyan-300/12 text-cyan-300"><PartyPopper /></span><h1 className="relative mt-5 text-3xl font-semibold tracking-[-0.045em] text-white">Reserva confirmada!</h1><p className="relative mt-2 text-sm text-muted-foreground">Seu próximo momento já está no ritmo. Os ingressos foram emitidos.</p></div>}
        <Card className="border-white/10 bg-card/85">
          <CardHeader className="border-b border-white/8"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-2xl">{order.event.title}</CardTitle><OrderStatus status={order.status} /></div><p className="mt-2 text-sm text-muted-foreground">Pedido {order.publicId} · {formatDateTime(order.createdAt)}</p></div><strong className="text-2xl text-primary">{formatMoney(order.totalCents)}</strong></div></CardHeader>
          <CardContent className="p-6">
            <div className="grid gap-3 rounded-xl border border-white/8 bg-black/10 p-4 text-sm sm:grid-cols-2"><span className="flex items-center gap-2"><CalendarCheck2 className="size-4 text-primary" /> {formatDateTime(order.event.startsAt)}</span><span className="flex items-center gap-2 text-muted-foreground"><MapPin className="size-4 text-primary" /> Consulte o ingresso para ver o local</span></div>
            <div className="mt-6 space-y-4">{order.items.map((item) => <div key={item.id} className="rounded-xl border border-white/8 p-4"><div className="flex items-center justify-between gap-4"><div><h2 className="font-medium text-white">{item.quantity}× {item.ticketTypeName}</h2><p className="mt-1 text-xs text-muted-foreground">{formatMoney(item.unitPriceCents)} por ingresso</p></div><Badge variant="outline">{formatMoney(item.quantity * item.unitPriceCents)}</Badge></div><div className="mt-4 grid gap-2 sm:grid-cols-2">{item.tickets.map((ticket) => <Button asChild variant="secondary" key={ticket.id} className="justify-start"><Link href={`/ingressos/${ticket.id}`}><TicketIcon /> Ingresso #{ticket.unitSequence}<span className="ml-auto text-xs text-muted-foreground">{ticket.status}</span></Link></Button>)}</div></div>)}</div>
            {!canCancel && order.status === "CONFIRMED" && <Alert className="mt-6"><CheckCircle2 /><AlertTitle>Cancelamento protegido por regras do evento</AlertTitle><AlertDescription>{hasUsed ? "Este pedido possui ingresso já utilizado." : "Pedidos podem ser cancelados até 48 horas antes do evento."}</AlertDescription></Alert>}
            <div className="mt-6 flex flex-wrap justify-end gap-2"><Button asChild variant="outline"><Link href="/ingressos">Ver todos os ingressos</Link></Button>{canCancel && <Button variant="destructive" onClick={cancel} disabled={busy}>{busy ? "Cancelando..." : "Cancelar pedido"}</Button>}</div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
