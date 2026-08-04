"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { Camera, CameraOff, CheckCircle2, Keyboard, LoaderCircle, MapPin, ScanLine, TicketCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
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

  return (
    <DashboardShell area="gate">
      <PageHeader eyebrow="Acesso autorizado" title="Validação de ingresso" description="Leia o QR e veja uma resposta clara em segundos. A primeira validação marca o ingresso como utilizado." />
      <div className="mt-6">
        {loading ? <StatePanel kind="loading" /> : events.length === 0 ? <StatePanel kind="empty" title="Nenhum evento atribuído" description="Peça ao organizador para enviar um convite de portaria para esta conta." /> : (
          <div className="space-y-6">
            <Card className="overflow-hidden">
              <CardHeader className="border-b border-white/8">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-base">Leitor de QR</CardTitle>
                  <Select value={selectedEvent} onValueChange={setSelectedEvent}>
                    <SelectTrigger className="w-full sm:w-72"><SelectValue /></SelectTrigger>
                    <SelectContent>{events.map((event) => <SelectItem key={event.id} value={event.id}>{event.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent className="p-5">
                <div className="relative aspect-video overflow-hidden rounded-2xl border border-white/10 bg-black lg:aspect-[16/7]">
                  <video ref={videoRef} className="h-full w-full object-cover" muted playsInline />
                  {!scanning && !result && <div className="absolute inset-0 grid place-items-center text-center"><div><span className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/12 text-primary"><ScanLine /></span><p className="mt-4 text-sm text-white">A câmera está pausada</p><p className="mt-1 text-xs text-muted-foreground">Posicione o QR dentro da área de leitura.</p></div></div>}
                  {scanning && <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-primary shadow-[0_0_40px_rgba(167,139,250,.32)]" />}
                </div>
                <div className="mt-4 flex gap-2">
                  {scanning ? <Button variant="outline" className="flex-1" onClick={stopCamera}><CameraOff /> Parar câmera</Button> : <Button className="flex-1" onClick={startCamera} disabled={busy}><Camera /> Iniciar leitura</Button>}
                </div>
              </CardContent>
            </Card>

            <ValidationResult result={result} rejection={rejection} busy={busy} onReset={reset} />

            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Keyboard className="size-4 text-primary" /> Leitura manual</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={submitManual} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
                  <div className="space-y-3">
                    <Label htmlFor="qr-payload">Conteúdo do QR</Label>
                    <Input id="qr-payload" value={manual} onChange={(event) => setManual(event.target.value)} placeholder="Cole o código para validar" autoComplete="off" />
                  </div>
                  <Button type="submit" variant="secondary" className="w-full sm:w-auto" disabled={busy || !manual.trim()}>{busy && <LoaderCircle className="animate-spin" />} Validar código</Button>
                </form>
              </CardContent>
            </Card>

            <AssignedEvent event={events.find((event) => event.id === selectedEvent)} />
          </div>
        )}
      </div>
    </DashboardShell>
  );
}

function ValidationResult({ result, rejection, busy, onReset }: { result?: GateValidation; rejection?: { title: string; detail: string }; busy: boolean; onReset: () => void }) {
  if (busy) return <Card className="smooth-ring-primary/20 shadow-primary/10 bg-primary/5"><CardContent className="flex items-center gap-3 p-5"><LoaderCircle className="animate-spin text-primary" /><span className="text-sm">Validando ingresso...</span></CardContent></Card>;
  if (result) return <Card className="smooth-ring-cyan-300/25 shadow-cyan-300/10 bg-cyan-300/6"><CardContent className="p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-cyan-300/12 text-cyan-300"><CheckCircle2 /></span><h2 className="mt-4 text-xl font-semibold text-white">Entrada liberada</h2><p className="mt-2 text-sm text-muted-foreground">{result.ticket.type} · {result.ticket.event}</p><Badge className="mt-4" variant="outline">{result.ticket.publicId}</Badge><Button className="mt-5 w-full" onClick={onReset}>Validar próximo</Button></CardContent></Card>;
  if (rejection) return <Card className="smooth-ring-destructive/25 shadow-destructive/10 bg-destructive/6"><CardContent className="p-6 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-destructive/12 text-destructive"><XCircle /></span><h2 className="mt-4 text-xl font-semibold text-white">{rejection.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{rejection.detail}</p><Button variant="outline" className="mt-5 w-full" onClick={onReset}>Tentar outro ingresso</Button></CardContent></Card>;
  return null;
}

function AssignedEvent({ event }: { event?: GateEvent }) {
  if (!event) return null;
  return <Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/8 text-primary"><TicketCheck /></span><div className="min-w-0 flex-1"><h3 className="text-sm font-medium text-white">{event.title}</h3><div className="mt-2 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:flex-wrap sm:gap-x-5"><p>{formatDateTime(event.startsAt)}</p><p className="flex items-center gap-1"><MapPin className="size-3" /> {event.venueName} · {event.city}</p></div></div></CardContent></Card>;
}
