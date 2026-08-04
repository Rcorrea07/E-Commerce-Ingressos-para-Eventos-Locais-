"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronLeft, MapPin, ShieldCheck, Ticket as TicketIcon } from "lucide-react";
import { QrCode } from "@/components/tickets/QrCode";
import { TicketStatus } from "@/components/tickets/TicketsExperience";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Ticket } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export function TicketDetails({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<Ticket>(); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const load = useCallback(async () => { setLoading(true); const { data, error: apiError } = await api.GET("/api/v1/tickets/{id}", { params: { path: { id: ticketId } } }); if (apiError) setError(problemMessage(apiError)); setTicket(data); setLoading(false); }, [ticketId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  if (loading) return <main className="content-grid py-12"><StatePanel kind="loading" /></main>;
  if (!ticket) return <main className="content-grid py-12"><StatePanel kind="error" description={error} action={{ label: "Voltar à carteira", onClick: () => window.location.assign("/ingressos") }} /></main>;
  return <main className="content-grid py-8 sm:py-12"><div className="mx-auto max-w-4xl"><Button variant="ghost" asChild className="mb-6 -ml-3 text-muted-foreground"><Link href="/ingressos"><ChevronLeft /> Minha carteira</Link></Button><Card className="smooth-shadow-ring-lg smooth-ring-white/10 shadow-black/40 overflow-hidden bg-card/88"><div className="h-1.5 bg-gradient-to-r from-primary via-violet-400 to-cyan-300" /><CardContent className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[1fr_280px] lg:items-center"><div><div className="flex flex-wrap items-center gap-2"><Badge variant="outline">{ticket.ticketType.name}</Badge><TicketStatus status={ticket.status} /></div><h1 className="mt-5 text-3xl font-semibold tracking-[-0.045em] text-white">{ticket.event.title}</h1><p className="mt-2 text-sm text-muted-foreground">Ingresso #{ticket.unitSequence} · pedido {ticket.orderPublicId}</p><div className="mt-7 space-y-3 text-sm"><p className="flex items-center gap-2"><CalendarDays className="size-4 text-primary" /> {formatDateTime(ticket.event.startsAt)}</p><p className="flex items-center gap-2"><MapPin className="size-4 text-primary" /> {ticket.event.venueName} · {ticket.event.city}, {ticket.event.state}</p></div>{ticket.status === "USED" && ticket.validatedAt && <Alert className="mt-6"><TicketIcon /><AlertTitle>Ingresso já utilizado</AlertTitle><AlertDescription>Validado em {formatDateTime(ticket.validatedAt)}.</AlertDescription></Alert>}{ticket.status === "CANCELLED" && <Alert variant="destructive" className="mt-6"><AlertTitle>Ingresso cancelado</AlertTitle><AlertDescription>Este QR não é mais válido para entrada.</AlertDescription></Alert>}</div><div className="flex flex-col items-center rounded-2xl border border-white/8 bg-white/[.03] p-5 text-center">{ticket.status === "ISSUED" ? <QrCode payload={ticket.qrPayload} size={230} /> : <span className="grid size-52 place-items-center rounded-xl bg-muted text-muted-foreground"><TicketIcon className="size-12" /></span>}<p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-cyan-300" /> QR assinado e de uso único</p></div></CardContent></Card></div></main>;
}
