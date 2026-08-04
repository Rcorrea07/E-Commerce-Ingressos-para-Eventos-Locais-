"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, CalendarDays, Check, ShieldCheck, Ticket, X } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { AdminEventDetails } from "@/lib/api/types";
import { formatAddress, formatDateTime, formatMoney } from "@/lib/format";

export function AdminEventReview({ eventId }: { eventId: string }) {
  const [event, setEvent] = useState<AdminEventDetails>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const result = await api.GET("/api/v1/admin/events/{id}", { params: { path: { id: eventId } } });
    if (result.error) setError(problemMessage(result.error, "Evento não encontrado."));
    setEvent(result.data);
    setLoading(false);
  }, [eventId]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function approve() {
    setBusy(true);
    const result = await api.POST("/api/v1/admin/events/{id}/approve", { params: { path: { id: eventId } } });
    if (result.error) toast.error(problemMessage(result.error));
    else { setEvent(result.data); toast.success("Evento aprovado e publicado."); }
    setBusy(false);
  }

  async function reject() {
    if (reason.trim().length < 10) { toast.error("Explique o motivo em pelo menos 10 caracteres."); return; }
    setBusy(true);
    const result = await api.POST("/api/v1/admin/events/{id}/reject", { params: { path: { id: eventId } }, body: { reason: reason.trim() } });
    if (result.error) toast.error(problemMessage(result.error));
    else { setEvent(result.data); setRejectOpen(false); toast.success("Evento devolvido ao produtor."); }
    setBusy(false);
  }

  if (loading) return <StatePanel kind="loading" description="Montando a revisão completa." />;
  if (error || !event) return <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void load() }} />;

  const cover = event.images.find((image) => image.kind === "COVER")?.url;
  const canReview = event.status === "PENDING_REVIEW";

  return (
    <div>
      <Button asChild variant="ghost" className="mb-5 -ml-2 text-muted-foreground"><Link href="/admin/eventos"><ArrowLeft /> Voltar aos eventos</Link></Button>
      <PageHeader eyebrow="Revisão editorial" title={event.title} description={`${event.organizer.name} · ${event.organizer.email}`} actions={canReview ? <ReviewActions busy={busy} reason={reason} setReason={setReason} rejectOpen={rejectOpen} setRejectOpen={setRejectOpen} approve={approve} reject={reject} /> : <Badge variant="secondary" className="h-7 px-3">{event.status}</Badge>} />

      {event.rejectionReason && <Alert variant="destructive" role="status" className="mt-6"><X /><AlertTitle>Motivo da rejeição</AlertTitle><AlertDescription>{event.rejectionReason}</AlertDescription></Alert>}

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.25fr_.75fr]">
        <div className="space-y-6">
          <Card className="overflow-hidden">
            <div className="relative aspect-[16/7] bg-muted">
              <Image src={cover ?? "/images/Event_1.png"} alt={`Capa de ${event.title}`} fill className="object-cover" sizes="(max-width:1280px) 100vw, 60vw" />
            </div>
            <CardContent className="p-6"><h2 className="text-xl font-semibold text-white">Apresentação</h2><p className="mt-3 whitespace-pre-line text-sm leading-7 text-muted-foreground">{event.description}</p></CardContent>
          </Card>
          {event.images.filter((image) => image.kind === "GALLERY").length > 0 && <Card><CardHeader><CardTitle>Galeria enviada</CardTitle></CardHeader><CardContent className="grid gap-3 sm:grid-cols-2">{event.images.filter((image) => image.kind === "GALLERY").map((image) => <div key={image.id} className="relative aspect-video overflow-hidden rounded-xl"><Image src={image.url} alt="Imagem da galeria" fill className="object-cover" sizes="40vw" /></div>)}</CardContent></Card>}
        </div>
        <div className="space-y-6">
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><CalendarDays className="size-4 text-primary" /> Operação</CardTitle></CardHeader><CardContent className="space-y-4 text-sm"><Info label="Início" value={formatDateTime(event.startsAt)} /><Info label="Término" value={formatDateTime(event.endsAt)} /><Info label="Categoria" value={event.category.name} /><Info label="Local" value={formatAddress(event)} /><Info label="Endereço" value={`${event.street}, ${event.number} · ${event.district} · CEP ${event.postalCode}`} /></CardContent></Card>
          <Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Ticket className="size-4 text-primary" /> Ingressos</CardTitle></CardHeader><CardContent className="space-y-3">{event.ticketTypes.map((ticketType) => <div key={ticketType.id} className="rounded-xl border border-white/8 bg-white/[.025] p-4"><div className="flex justify-between gap-3"><div><strong className="text-sm text-white">{ticketType.name}</strong><p className="mt-1 text-xs text-muted-foreground">{ticketType.units} unidades · máx. {ticketType.maxPerOrder} por pedido</p></div><strong className="text-sm text-primary">{formatMoney(ticketType.priceCents)}</strong></div></div>)}</CardContent></Card>
          <Alert className="border-cyan-300/15 bg-cyan-300/5"><ShieldCheck className="text-cyan-300" /><AlertTitle>Decisão auditada</AlertTitle><AlertDescription>A aprovação publica o evento imediatamente. A rejeição exige uma justificativa clara para o produtor.</AlertDescription></Alert>
        </div>
      </div>
    </div>
  );
}

function ReviewActions({ busy, reason, setReason, rejectOpen, setRejectOpen, approve, reject }: { busy: boolean; reason: string; setReason: (value: string) => void; rejectOpen: boolean; setRejectOpen: (open: boolean) => void; approve: () => Promise<void>; reject: () => Promise<void> }) {
  return <>
    <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
      <DialogTrigger asChild><Button variant="destructive"><X /> Rejeitar</Button></DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Devolver ao produtor</DialogTitle><DialogDescription>Explique objetivamente o que precisa ser corrigido antes de uma nova análise.</DialogDescription></DialogHeader>
        <Textarea value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ex.: A imagem de capa não permite identificar o evento..." maxLength={1000} rows={5} />
        <p className="text-right text-xs text-muted-foreground">{reason.length}/1000</p>
        <DialogFooter><Button variant="outline" onClick={() => setRejectOpen(false)}>Voltar</Button><Button variant="destructive" disabled={busy || reason.trim().length < 10} onClick={() => void reject()}>Confirmar rejeição</Button></DialogFooter>
      </DialogContent>
    </Dialog>
    <AlertDialog>
      <AlertDialogTrigger asChild><Button disabled={busy}><Check /> Aprovar e publicar</Button></AlertDialogTrigger>
      <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Publicar este evento?</AlertDialogTitle><AlertDialogDescription>Ele ficará disponível imediatamente para o público e poderá receber reservas.</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Revisar novamente</AlertDialogCancel><AlertDialogAction onClick={() => void approve()}>Aprovar evento</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
    </AlertDialog>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><span className="block text-xs text-muted-foreground">{label}</span><span className="mt-1 block text-white">{value}</span></div>; }
