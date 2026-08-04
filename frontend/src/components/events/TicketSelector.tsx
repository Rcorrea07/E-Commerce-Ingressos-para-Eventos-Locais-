"use client";

import { useMemo, useState } from "react";
import { Minus, Plus, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PublicEvent } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

export type TicketSelection = Record<string, number>;

export function TicketSelector({ event, busy, onContinue }: { event: PublicEvent; busy: boolean; onContinue: (selection: TicketSelection) => void }) {
  const [selection, setSelection] = useState<TicketSelection>({});

  const activeTickets = event.ticketTypes.filter((ticket) => ticket.active);
  const totals = useMemo(() => activeTickets.reduce((result, ticket) => {
    const quantity = selection[ticket.id] ?? 0;
    return { quantity: result.quantity + quantity, cents: result.cents + quantity * ticket.priceCents };
  }, { quantity: 0, cents: 0 }), [activeTickets, selection]);

  function update(ticketId: string, delta: number) {
    const ticket = activeTickets.find((candidate) => candidate.id === ticketId);
    if (!ticket) return;
    setSelection((current) => {
      const value = Math.max(0, Math.min((current[ticketId] ?? 0) + delta, ticket.available, ticket.maxPerOrder));
      return { ...current, [ticketId]: value };
    });
  }

  return (
    <Card className="smooth-shadow-ring-lg smooth-ring-white/10 shadow-black/40 sticky top-24 bg-card/88">
      <CardHeader>
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-lg">Escolha seus ingressos</CardTitle>
          <TicketIcon className="size-5 text-primary" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {activeTickets.map((ticket) => {
            const quantity = selection[ticket.id] ?? 0;
            const soldOut = ticket.available === 0;
            return (
              <div key={ticket.id} className="rounded-xl border border-white/8 bg-black/12 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-white">{ticket.name}</h3>
                      {soldOut && <Badge variant="destructive">Esgotado</Badge>}
                    </div>
                    {ticket.description && <p className="mt-1 text-xs leading-5 text-muted-foreground">{ticket.description}</p>}
                    <p className="mt-2 font-semibold text-primary">{formatMoney(ticket.priceCents)}</p>
                    {!soldOut && <p className="mt-1 text-[11px] text-muted-foreground">Até {ticket.maxPerOrder} por pedido · {ticket.available} disponíveis</p>}
                  </div>
                  {!soldOut && (
                    <div className="flex shrink-0 items-center rounded-lg border border-white/10 bg-background/70 p-1">
                      <Button variant="ghost" size="icon-sm" onClick={() => update(ticket.id, -1)} disabled={quantity === 0} aria-label={`Diminuir ${ticket.name}`}><Minus /></Button>
                      <span className="w-8 text-center text-sm font-semibold" aria-live="polite">{quantity}</span>
                      <Button variant="ghost" size="icon-sm" onClick={() => update(ticket.id, 1)} disabled={quantity >= ticket.available || quantity >= ticket.maxPerOrder} aria-label={`Aumentar ${ticket.name}`}><Plus /></Button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-5 border-t border-white/8 pt-5">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{totals.quantity} {totals.quantity === 1 ? "ingresso" : "ingressos"}</p>
              <p className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-white">{formatMoney(totals.cents)}</p>
            </div>
            <Badge variant="outline" className="border-cyan-300/20 text-cyan-300"><ShieldCheck /> Reserva segura</Badge>
          </div>
          <Button className="mt-5 h-12 w-full" disabled={totals.quantity === 0 || busy || event.soldOut} onClick={() => onContinue(selection)}>
            {busy ? "Reservando ingressos..." : "Reservar e continuar"}
          </Button>
          <p className="mt-3 text-center text-[11px] leading-4 text-muted-foreground">A reserva começa no próximo passo e dura até 15 minutos.</p>
        </div>
      </CardContent>
    </Card>
  );
}
