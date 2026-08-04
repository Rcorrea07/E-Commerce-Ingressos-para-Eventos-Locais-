"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, Banknote, CalendarDays, ShoppingBag, Ticket } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Analytics } from "@/lib/api/types";
import { formatDateTime, formatMoney } from "@/lib/format";
import { orderStatusLabel } from "@/lib/labels";

export function AnalyticsDashboard({ scope }: { scope: "organizer" | "admin" }) {
  const [data, setData] = useState<Analytics>(); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const load = useCallback(async () => {
    setLoading(true);
    const result = scope === "admin" ? await api.GET("/api/v1/admin/analytics") : await api.GET("/api/v1/organizer/analytics");
    if (result.error) setError(problemMessage(result.error)); setData(result.data); setLoading(false);
  }, [scope]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const cards = useMemo(() => data ? [
    { label: "Eventos", value: data.summary.totalEvents, icon: CalendarDays },
    { label: "Pedidos confirmados", value: data.summary.confirmedOrders, icon: ShoppingBag },
    { label: "Ingressos emitidos", value: data.summary.issuedTickets, icon: Ticket },
    { label: "Receita simulada", value: formatMoney(data.summary.netRevenueCents), icon: Banknote },
  ] : [], [data]);
  if (loading) return <StatePanel kind="loading" description="Organizando os indicadores." />;
  if (!data) return <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void load() }} />;
  const hasOccupancy = data.occupancy.length > 0;

  return (
    <div>
      <PageHeader
        eyebrow={scope === "admin" ? "Pulso global" : "Seus eventos"}
        title={scope === "admin" ? "A plataforma agora" : "O ritmo da sua operação"}
        description="Dados úteis para decidir o próximo passo, sem ruído."
      />
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((item) => <MetricCard key={item.label} {...item} />)}
      </div>
      <div className="mt-6 space-y-6">
        <Card className="h-fit">
          <CardHeader><CardTitle className="text-base">Funil de checkout</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <FunnelLine label="Iniciados" value={data.funnel.started} total={data.funnel.started} />
            <FunnelLine label="Confirmados" value={data.funnel.confirmed} total={data.funnel.started} />
            <FunnelLine label="Abandonados" value={data.funnel.abandoned} total={data.funnel.started} />
            <div className="flex items-center justify-between rounded-xl bg-primary/7 p-4">
              <span className="text-sm text-muted-foreground">Conversão</span>
              <strong className="text-xl text-primary">{(data.funnel.conversionRate * 100).toFixed(1)}%</strong>
            </div>
          </CardContent>
        </Card>
        {hasOccupancy && (
          <Card className="h-fit">
            <CardHeader><CardTitle className="text-base">Ocupação por ingresso</CardTitle></CardHeader>
            <CardContent className="grid gap-x-8 gap-y-4 md:grid-cols-2">
              {data.occupancy.slice(0, 6).map((item) => (
                <div key={item.ticketTypeId}>
                  <div className="mb-2 flex justify-between gap-4 text-sm">
                    <span className="truncate text-white">{item.event} · {item.ticketType}</span>
                    <span className="text-muted-foreground">{(item.rate * 100).toFixed(0)}%</span>
                  </div>
                  <Progress value={item.rate * 100} />
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
      <Card className="mt-6 overflow-hidden">
        <CardHeader><CardTitle className="text-base">Pedidos recentes</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Evento</TableHead><TableHead>Cliente</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader>
              <TableBody>{data.recentOrders.length === 0 ? <TableRow><TableCell colSpan={5} className="py-10 text-center text-muted-foreground">Nenhum pedido recente.</TableCell></TableRow> : data.recentOrders.map((order) => <TableRow key={order.id}><TableCell><span className="font-mono text-xs">{order.publicId}</span><span className="mt-1 block text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</span></TableCell><TableCell>{order.eventTitle}</TableCell><TableCell>{order.customerName}</TableCell><TableCell><Badge variant={order.status === "CONFIRMED" ? "default" : "secondary"}>{orderStatusLabel(order.status)}</Badge></TableCell><TableCell className="text-right font-medium">{formatMoney(order.totalCents)}</TableCell></TableRow>)}</TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string | number; icon: typeof Activity }) { return <Card><CardContent className="p-5"><div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-primary/9 text-primary"><Icon className="size-4" /></span><Activity className="size-4 text-cyan-300" /></div><strong className="mt-5 block text-2xl tracking-[-0.04em] text-white">{value}</strong><span className="mt-1 block text-xs text-muted-foreground">{label}</span></CardContent></Card>; }
function FunnelLine({ label, value, total }: { label: string; value: number; total: number }) { const percent = total ? (value / total) * 100 : 0; return <div><div className="mb-2 flex items-center justify-between text-sm"><span className="text-muted-foreground">{label}</span><span className="text-white">{value}</span></div><Progress value={percent} /></div>; }
