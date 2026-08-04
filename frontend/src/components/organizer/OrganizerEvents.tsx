"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CalendarDays, ChevronRight, MapPin, Plus } from "lucide-react";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { OrganizerEvent } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

export function EventStatusBadge({ status }: { status: OrganizerEvent["status"] }) { const labels = { DRAFT: "Rascunho", PENDING_REVIEW: "Em análise", REJECTED: "Rejeitado", PUBLISHED: "Publicado", CANCELLED: "Cancelado" }; return <Badge variant={status === "PUBLISHED" ? "default" : status === "REJECTED" ? "destructive" : "secondary"}>{labels[status]}</Badge>; }

export function OrganizerEvents() {
  const [events, setEvents] = useState<OrganizerEvent[]>([]); const [loading, setLoading] = useState(true); const [error, setError] = useState<string>();
  const load = useCallback(async () => { setLoading(true); const { data, error: apiError } = await api.GET("/api/v1/organizer/events"); if (apiError) setError(problemMessage(apiError)); setEvents(data ?? []); setLoading(false); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  return <DashboardShell area="organizer"><PageHeader eyebrow="Produção" title="Seus eventos" description="Crie rascunhos, acompanhe a moderação e administre ingressos e equipe." actions={<Button asChild><Link href="/produtor/eventos/novo"><Plus /> Novo evento</Link></Button>} /><div className="mt-6">{loading ? <StatePanel kind="loading" /> : error ? <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void load() }} /> : events.length === 0 ? <StatePanel kind="empty" title="Seu primeiro evento começa aqui" description="Crie um rascunho e complete dados, ingressos e capa antes de enviar para análise." action={{ label: "Criar evento", onClick: () => window.location.assign("/produtor/eventos/novo") }} /> : <div className="space-y-3">{events.map((event) => <Link href={`/produtor/eventos/${event.id}`} key={event.id}><Card className="transition hover:border-primary/30"><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary"><CalendarDays /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="font-medium text-white">{event.title}</h2><EventStatusBadge status={event.status} /></div><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" /> {event.venueName} · {event.city}, {event.state} · {formatDateTime(event.startsAt)}</p>{event.rejectionReason && <p className="mt-2 line-clamp-1 text-xs text-destructive">{event.rejectionReason}</p>}</div><div className="flex items-center gap-5"><div className="text-right text-xs text-muted-foreground"><span className="block">{event.ticketTypes?.length ?? 0} tipos</span><span>{event.images?.length ?? 0} imagens</span></div><ChevronRight className="size-4 text-muted-foreground" /></div></CardContent></Card></Link>)}</div>}</div></DashboardShell>;
}
