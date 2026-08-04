"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, MapPin, Ticket as TicketIcon } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Ticket } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export function TicketStatus({ status }: { status: Ticket["status"] }) { return <Badge variant={status === "ISSUED" ? "default" : status === "USED" ? "secondary" : "destructive"}>{status === "ISSUED" ? "Válido" : status === "USED" ? "Utilizado" : "Cancelado"}</Badge>; }

export function TicketsExperience() {
  const [tickets, setTickets] = useState<Ticket[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const load = useCallback(async () => { setLoading(true); const { data, error: apiError } = await api.GET("/api/v1/tickets"); if (apiError) setError(problemMessage(apiError)); setTickets(data ?? []); setLoading(false); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  return <main className="content-grid py-10 sm:py-14"><PageHeader eyebrow="Carteira digital" title="Meus ingressos" description="Cada ingresso é individual e possui um QR de uso único." /><div className="mt-8">{loading ? <StatePanel kind="loading" /> : error ? <StatePanel kind="error" description={error} action={{ label: "Entrar", onClick: () => window.location.assign("/entrar?redirect=/ingressos") }} /> : tickets.length === 0 ? <StatePanel kind="empty" title="Sua carteira está vazia" description="Reserve uma experiência e seus ingressos aparecerão aqui." /> : <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{tickets.map((ticket) => <Link href={`/ingressos/${ticket.id}`} key={ticket.id}><Card className="h-full overflow-hidden transition hover:-translate-y-1 hover:border-primary/30"><div className="h-1 bg-gradient-to-r from-primary to-cyan-300" /><CardContent className="p-5"><div className="flex items-start justify-between gap-3"><span className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><TicketIcon /></span><TicketStatus status={ticket.status} /></div><h2 className="mt-5 text-lg font-semibold text-white">{ticket.event.title}</h2><p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><CalendarDays className="size-3.5" /> {formatDateTime(ticket.event.startsAt)}</p><p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><MapPin className="size-3.5" /> {ticket.event.venueName} · {ticket.event.city}</p><div className="mt-5 flex items-center justify-between border-t border-white/8 pt-4 text-sm"><span className="text-muted-foreground">{ticket.ticketType.name} · #{ticket.unitSequence}</span><ChevronRight className="size-4 text-primary" /></div></CardContent></Card></Link>)}</div>}</div></main>;
}
