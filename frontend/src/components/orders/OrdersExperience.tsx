"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, ReceiptText, Ticket } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Order } from "@/lib/api/types";
import { formatDateTime, formatMoney } from "@/lib/format";

export function OrdersExperience() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const load = useCallback(async () => { setLoading(true); const { data, error: apiError } = await api.GET("/api/v1/orders"); if (apiError) setError(problemMessage(apiError, "Entre para ver seus pedidos.")); setOrders(data ?? []); setLoading(false); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  return (
    <main className="content-grid py-10 sm:py-14">
      <PageHeader eyebrow="Histórico" title="Seus pedidos" description="Acompanhe reservas confirmadas, cancelamentos e os ingressos emitidos." />
      <div className="mt-8">{loading ? <StatePanel kind="loading" /> : error ? <StatePanel kind="error" description={error} action={{ label: "Entrar", onClick: () => window.location.assign("/entrar?redirect=/pedidos") }} /> : orders.length === 0 ? <StatePanel kind="empty" title="Nenhum pedido ainda" description="Quando você confirmar uma experiência, ela aparecerá aqui." /> : <div className="space-y-4">{orders.map((order) => <Link href={`/pedidos/${order.id}`} key={order.id} className="block"><Card className="transition hover:border-primary/30"><CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center"><span className="grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><ReceiptText /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-semibold text-white">{order.event.title}</h2><OrderStatus status={order.status} /></div><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> {formatDateTime(order.event.startsAt)} · pedido {order.publicId}</p></div><div className="flex items-center justify-between gap-6 sm:justify-end"><div><p className="text-xs text-muted-foreground">{order.items.reduce((total, item) => total + item.quantity, 0)} ingressos</p><strong className="text-sm text-primary">{formatMoney(order.totalCents)}</strong></div><ChevronRight className="size-4 text-muted-foreground" /></div></CardContent></Card></Link>)}</div>}</div>
    </main>
  );
}

export function OrderStatus({ status }: { status: Order["status"] }) {
  const label = status === "CONFIRMED" ? "Confirmado" : status === "CANCELLED_BY_CUSTOMER" ? "Cancelado por você" : "Evento cancelado";
  return <Badge variant={status === "CONFIRMED" ? "default" : "secondary"}>{status === "CONFIRMED" && <Ticket />}{label}</Badge>;
}
