"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Keyboard, LoaderCircle, MapPin, ScanLine, ShieldCheck, TicketCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { api } from "@/lib/api/client";
import { asProblem, problemMessage } from "@/lib/api/problem";
import type { GateEvent, GateValidation } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

type ScannerControls = { stop: () => void };

export function GateExperience() {
  const [events, setEvents] = useState<GateEvent[]>([]); const [selectedEvent, setSelectedEvent] = useState<string>(); const [manual, setManual] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [scanning, setScanning] = useState(false); const [result, setResult] = useState<GateValidation>(); const [rejection, setRejection] = useState<{ title: string; detail: string }>();
  const videoRef = useRef<HTMLVideoElement>(null); const controls = useRef<ScannerControls | undefined>(undefined); const validating = useRef(false);
  const load = useCallback(async () => { const { data, error } = await api.GET("/api/v1/gate/events"); if (error) toast.error(problemMessage(error)); const list = data ?? []; setEvents(list); setSelectedEvent((current) => current ?? list[0]?.id); setLoading(false); }, []);
  useEffect(() => { void Promise.resolve().then(load); return () => controls.current?.stop(); }, [load]);

  const validate = useCallback(async (payload: string) => {
    if (!payload.trim() || validating.current) return; validating.current = true; setBusy(true); setResult(undefined); setRejection(undefined);
    const { data, error } = await api.POST("/api/v1/gate/tickets/validate", { body: { qrPayload: payload.trim() } });
    if (data) { setResult(data); controls.current?.stop(); setScanning(false); }
    else { const problem = asProblem(error); setRejection({ title: problem?.code === "TICKET_ALREADY_USED" ? "Ingresso já utilizado" : "Entrada não autorizada", detail: problemMessage(error) }); }
    setBusy(false); validating.current = false;
  }, []);

  async function startCamera() {
    if (!videoRef.current) return;
    try {
      setResult(undefined); setRejection(undefined); setScanning(true);
      const { BrowserQRCodeReader } = await import("@zxing/browser");
      const reader = new BrowserQRCodeReader();
      controls.current = await reader.decodeFromVideoDevice(undefined, videoRef.current, (scanResult) => { if (scanResult) void validate(scanResult.getText()); });
    } catch { setScanning(false); toast.error("Não foi possível acessar a câmera. Use a leitura manual."); }
  }
  function stopCamera() { controls.current?.stop(); controls.current = undefined; setScanning(false); }
  function submitManual(event: FormEvent) { event.preventDefault(); void validate(manual); }
  function reset() { setResult(undefined); setRejection(undefined); setManual(""); validating.current = false; }

  return <DashboardShell area="gate"><PageHeader eyebrow="Acesso autorizado" title="Validação de ingresso" description="Leia o QR e veja uma resposta clara em segundos. A primeira validação marca o ingresso como utilizado." /><div className="mt-6">{loading ? <StatePanel kind="loading" /> : events.length === 0 ? <StatePanel kind="empty" title="Nenhum evento atribuído" description="Peça ao organizador para enviar um convite de portaria para esta conta." /> : <div className="grid gap-6 xl:grid-cols-[1fr_360px]"><Card className="overflow-hidden"><CardHeader className="border-b border-white/8"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-base">Leitor de QR</CardTitle><Select value={selectedEvent} onValueChange={setSelectedEvent}><SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger><SelectContent>{events.map((event) => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}</SelectContent></Select></div></CardHeader><CardContent className="p-5"><div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black"><video ref={videoRef} className="h-full w-full object-cover" muted playsInline />{!scanning && !result && <div className="absolute inset-0 grid place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary"><ScanLine /></span><p className="mt-4 text-sm text-white">A câmera está pausada</p><p className="mt-1 text-xs text-muted-foreground">Posicione o QR dentro da área de leitura.</p></div></div>}{scanning && <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-primary shadow-[0_0_40px_rgba(167,139,250,.32)]" />}</div><div className="mt-4 flex gap-2">{scanning ? <Button variant="outline" className="flex-1" onClick={stopCamera}><CameraOff /> Parar câmera</Button> : <Button className="flex-1" onClick={startCamera} disabled={busy}><Camera /> Iniciar leitura</Button>}</div></CardContent></Card><div className="space-y-6"><ValidationResult result={result} rejection={rejection} busy={busy} onReset={reset} /><Card><CardHeader><CardTitle className="flex items-center gap-2 text-base"><Keyboard className="size-4 text-primary" /> Leitura manual</CardTitle></CardHeader><CardContent><form onSubmit={submitManual} className="space-y-3"><Label htmlFor="qr-payload">Conteúdo do QR</Label><Input id="qr-payload" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Cole o código para validar" autoComplete="off" /><Button type="submit" variant="secondary" className="w-full" disabled={busy || !manual.trim()}>{busy && <LoaderCircle className="animate-spin" />} Validar código</Button></form></CardContent></Card><AssignedEvent event={events.find((event) => event.id === selectedEvent)} /></div></div>}</div></DashboardShell>;
}

function ValidationResult({ result, rejection, busy, onReset }: { result?: GateValidation; rejection?: { title: string; detail: string }; busy: boolean; onReset: () => void }) {
  if (busy) return <Card className="border-primary/20 bg-primary/5"><CardContent className="flex items-center gap-3 p-5"><LoaderCircle className="animate-spin text-primary" /><span className="text-sm">Validando ingresso...</span></CardContent></Card>;
  if (result) return <Card className="border-cyan-300/25 bg-cyan-300/6"><CardContent className="p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-cyan-300/12 text-cyan-300"><CheckCircle2 /></span><h2 className="mt-4 text-xl font-semibold text-white">Entrada liberada</h2><p className="mt-2 text-sm text-muted-foreground">{result.ticket.type} · {result.ticket.event}</p><Badge className="mt-4" variant="outline">{result.ticket.publicId}</Badge><Button className="mt-5 w-full" onClick={onReset}>Validar próximo</Button></CardContent></Card>;
  if (rejection) return <Card className="border-destructive/25 bg-destructive/6"><CardContent className="p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/12 text-destructive"><XCircle /></span><h2 className="mt-4 text-xl font-semibold text-white">{rejection.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{rejection.detail}</p><Button variant="outline" className="mt-5 w-full" onClick={onReset}>Tentar outro ingresso</Button></CardContent></Card>;
  return <Alert className="border-cyan-300/12 bg-cyan-300/4"><ShieldCheck className="text-cyan-300" /><AlertTitle>Pronto para validar</AlertTitle><AlertDescription>O resultado exibirá apenas os dados necessários para a portaria.</AlertDescription></Alert>;
}

function AssignedEvent({ event }: { event?: GateEvent }) { if (!event) return null; return <Card><CardContent className="p-5"><div className="flex items-start gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><TicketCheck /></span><div><h3 className="text-sm font-medium text-white">{event.title}</h3><p className="mt-2 text-xs text-muted-foreground">{formatDateTime(event.startsAt)}</p><p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground"><MapPin className="size-3" /> {event.venueName} · {event.city}</p></div></div></CardContent></Card>; }
