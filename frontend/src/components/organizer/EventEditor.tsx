"use client";

import Image from "next/image";
import { FormEvent, type ComponentProps, useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowDown, ArrowLeft, ArrowUp, CircleAlert, ImagePlus, LoaderCircle, Pencil, Plus, Send, Ticket, Trash2, UserPlus, XCircle } from "lucide-react";
import { toast } from "sonner";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import { PageHeader } from "@/components/layout/PageHeader";
import { EventStatusBadge } from "@/components/organizer/OrganizerEvents";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/lib/api/client";
import { fieldErrors, problemMessage } from "@/lib/api/problem";
import type { Category, OrganizerEvent, StaffInvitation } from "@/lib/api/types";
import { formatCep, lookupCep, normalizeCep } from "@/lib/cep";
import { formatDateTime, formatMoney } from "@/lib/format";
import { invitationStatusLabels } from "@/lib/labels";

type EventForm = { categoryId: string; title: string; slug: string; description: string; venueName: string; postalCode: string; street: string; number: string; complement: string; district: string; city: string; state: string; startsAt: string; endsAt: string; timezone: string };
const blank: EventForm = { categoryId: "", title: "", slug: "", description: "", venueName: "", postalCode: "", street: "", number: "", complement: "", district: "", city: "", state: "", startsAt: "", endsAt: "", timezone: "America/Sao_Paulo" };
type CepStatus = "idle" | "loading" | "found" | "notFound" | "unavailable";

export function EventEditor({ eventId }: { eventId?: string }) {
  const router = useRouter(); const editing = Boolean(eventId); const [event, setEvent] = useState<OrganizerEvent>(); const [categories, setCategories] = useState<Category[]>([]); const [form, setForm] = useState<EventForm>(blank); const [loading, setLoading] = useState(editing); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>(); const [confirmAction, setConfirmAction] = useState<"submit" | "cancel">();

  const load = useCallback(async () => {
    const [categoryResult, eventResult] = await Promise.all([api.GET("/api/v1/categories"), editing ? api.GET("/api/v1/organizer/events") : Promise.resolve({ data: [] as OrganizerEvent[], error: undefined })]);
    setCategories(categoryResult.data ?? []);
    if (editing) {
      const found = eventResult.data?.find((item) => item.id === eventId);
      if (!found) setError("Evento não encontrado ou sem permissão de acesso.");
      else { setEvent(found); setForm(fromEvent(found)); }
    }
    setLoading(false);
  }, [editing, eventId]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  const update = useCallback((field: keyof EventForm, value: string) => { setForm((current) => ({ ...current, [field]: value, ...(field === "title" && !editing ? { slug: slugify(value) } : {}) })); }, [editing]);

  async function save(eventSubmit: FormEvent) {
    eventSubmit.preventDefault(); setBusy(true); setError(undefined);
    const body = { ...form, postalCode: normalizeCep(form.postalCode), complement: form.complement || undefined, startsAt: new Date(form.startsAt).toISOString(), endsAt: new Date(form.endsAt).toISOString(), state: form.state.toUpperCase() };
    const result = editing && eventId ? await api.PATCH("/api/v1/organizer/events/{id}", { params: { path: { id: eventId } }, body: { categoryId: body.categoryId, title: body.title, description: body.description, venueName: body.venueName, postalCode: body.postalCode, street: body.street, number: body.number, complement: body.complement, district: body.district, city: body.city, state: body.state, startsAt: body.startsAt, endsAt: body.endsAt, timezone: body.timezone } }) : await api.POST("/api/v1/organizer/events", { body });
    if (result.error) { const validation = fieldErrors(result.error).map((item) => item.message).filter(Boolean).join(" · "); setError(validation || problemMessage(result.error)); }
    else if (result.data) { toast.success(editing ? "Evento atualizado." : "Rascunho criado."); if (!editing) router.replace(`/produtor/eventos/${result.data.id}`); else await load(); }
    setBusy(false);
  }

  async function runAction() {
    if (!event || !confirmAction) return; setBusy(true);
    const result = confirmAction === "submit" ? await api.POST("/api/v1/organizer/events/{id}/submit", { params: { path: { id: event.id } } }) : await api.POST("/api/v1/organizer/events/{id}/cancel", { params: { path: { id: event.id } } });
    if (result.error) toast.error(problemMessage(result.error)); else { toast.success(confirmAction === "submit" ? "Evento enviado para análise." : "Evento cancelado."); await load(); }
    setBusy(false); setConfirmAction(undefined);
  }

  if (loading) return <DashboardShell area="organizer"><StatePanel kind="loading" /></DashboardShell>;
  if (editing && !event) return <DashboardShell area="organizer"><StatePanel kind="error" description={error} action={{ label: "Voltar aos eventos", onClick: () => router.push("/produtor/eventos") }} /></DashboardShell>;
  const editable = !event || event.status === "DRAFT" || event.status === "REJECTED";

  return <DashboardShell area="organizer"><Button variant="ghost" className="mb-5 -ml-3 text-muted-foreground" onClick={() => router.push("/produtor/eventos")}><ArrowLeft /> Voltar</Button><PageHeader eyebrow={editing ? "Gestão do evento" : "Novo rascunho"} title={editing ? event!.title : "Crie uma nova experiência"} description={editing ? "Dados, ingressos, mídia e portaria em uma visão única." : "Comece pelos dados essenciais. Você poderá completar ingressos e imagens depois."} actions={event && <><EventStatusBadge status={event.status} />{(event.status === "DRAFT" || event.status === "REJECTED") && <Button onClick={() => setConfirmAction("submit")}><Send /> Enviar para análise</Button>}{event.status !== "CANCELLED" && <Button variant="destructive" onClick={() => setConfirmAction("cancel")}><XCircle /> Cancelar evento</Button>}</>} />{event?.rejectionReason && <Alert variant="destructive" className="mt-6"><CircleAlert /><AlertTitle>Ajustes solicitados pela moderação</AlertTitle><AlertDescription>{event.rejectionReason}</AlertDescription></Alert>}<Tabs defaultValue="dados" className="mt-6"><TabsList className="w-full justify-start overflow-x-auto overflow-y-hidden"><TabsTrigger value="dados">Dados</TabsTrigger>{editing && <><TabsTrigger value="ingressos">Ingressos</TabsTrigger><TabsTrigger value="midia">Mídia</TabsTrigger><TabsTrigger value="portaria">Portaria</TabsTrigger></>}</TabsList><TabsContent value="dados"><EventDataForm form={form} categories={categories} editing={editing} editable={editable} busy={busy} error={error} setError={setError} update={update} submit={save} /></TabsContent>{event && <><TabsContent value="ingressos"><TicketTypesPanel event={event} editable={editable} onChange={load} /></TabsContent><TabsContent value="midia"><MediaPanel event={event} editable={editable} onChange={load} /></TabsContent><TabsContent value="portaria"><StaffPanel event={event} /></TabsContent></>}</Tabs><AlertDialog open={Boolean(confirmAction)} onOpenChange={(open) => !open && setConfirmAction(undefined)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{confirmAction === "submit" ? "Enviar evento para análise?" : "Cancelar este evento?"}</AlertDialogTitle><AlertDialogDescription>{confirmAction === "submit" ? "Enquanto estiver em análise, conteúdo, ingressos e imagens ficarão bloqueados para edição." : "As vendas serão encerradas, checkouts liberados e ingressos ficarão inválidos. Esta ação não pode ser desfeita."}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Voltar</AlertDialogCancel><AlertDialogAction onClick={runAction} disabled={busy}>{busy ? "Processando..." : confirmAction === "submit" ? "Enviar para análise" : "Cancelar evento"}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog></DashboardShell>;
}

function EventDataForm({ form, categories, editing, editable, busy, error, setError, update, submit }: { form: EventForm; categories: Category[]; editing: boolean; editable: boolean; busy: boolean; error?: string; setError: (value?: string) => void; update: (field: keyof EventForm, value: string) => void; submit: (event: FormEvent) => void }) {
  const [cepStatus, setCepStatus] = useState<CepStatus>("idle");
  const [cepError, setCepError] = useState<string>();
  const formRef = useRef<EventForm>(form);

  useEffect(() => { formRef.current = form; }, [form]);

  const findCep = useCallback(async (postalCode: string, snapshot: EventForm, signal: AbortSignal) => {
    setCepStatus("loading");
    setCepError(undefined);

    try {
      const address = await lookupCep(postalCode, signal);
      if (signal.aborted) return;
      if (!address) {
        setCepStatus("notFound");
        setCepError("CEP não encontrado. Confira os números ou preencha o endereço manualmente.");
        return;
      }

      const current = formRef.current;
      if (current.street === snapshot.street && address.street) update("street", address.street);
      if (current.district === snapshot.district && address.district) update("district", address.district);
      if (current.city === snapshot.city && address.city) update("city", address.city);
      if (current.state === snapshot.state && address.state) update("state", address.state);
      setCepStatus("found");
    } catch {
      if (signal.aborted) return;
      setCepStatus("unavailable");
      setCepError("Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.");
    }
  }, [update]);

  useEffect(() => {
    const postalCode = normalizeCep(form.postalCode);
    if (postalCode.length !== 8) return;
    const controller = new AbortController();
    void findCep(postalCode, formRef.current, controller.signal);
    return () => controller.abort();
  }, [findCep, form.postalCode]);

  function updatePostalCode(value: string) {
    setCepStatus("idle");
    setCepError(undefined);
    update("postalCode", normalizeCep(value));
  }

  function handleSubmit(eventSubmit: FormEvent) {
    if (!form.categoryId) {
      eventSubmit.preventDefault();
      setError("Escolha uma categoria para continuar.");
      return;
    }

    const postalCode = normalizeCep(form.postalCode);
    if (postalCode.length !== 8) {
      eventSubmit.preventDefault();
      setCepStatus("notFound");
      setCepError("Informe um CEP válido com 8 dígitos.");
      return;
    }
    if (cepStatus === "idle" || cepStatus === "loading") {
      eventSubmit.preventDefault();
      setCepError("Aguarde a validação do CEP terminar.");
      return;
    }
    if (cepStatus === "notFound") {
      eventSubmit.preventDefault();
      return;
    }

    if (new Date(form.endsAt) <= new Date(form.startsAt)) {
      eventSubmit.preventDefault();
      setError("O término deve acontecer depois do início.");
      return;
    }

    submit(eventSubmit);
  }

  return <Card><CardHeader><CardTitle className="text-base">Informações do evento</CardTitle></CardHeader><CardContent><form onSubmit={handleSubmit} className="space-y-6"><fieldset disabled={!editable || busy} className="space-y-6"><div className="grid gap-4 sm:grid-cols-2"><EditorField label="Título" id="title" value={form.title} onChange={(value) => update("title", value)} /><div className="space-y-2"><Label htmlFor="categoryId">Categoria</Label><Select value={form.categoryId} onValueChange={(value) => update("categoryId", value)}><SelectTrigger id="categoryId" className="w-full" aria-invalid={!form.categoryId && Boolean(error)}><SelectValue placeholder="Escolha uma categoria" /></SelectTrigger><SelectContent>{categories.map((category) => <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>)}</SelectContent></Select></div>{!editing && <EditorField label="Slug público" id="slug" value={form.slug} onChange={(value) => update("slug", slugify(value))} />}<div className={!editing ? "" : "sm:col-span-2"}><EditorField label="Local" id="venueName" value={form.venueName} onChange={(value) => update("venueName", value)} /></div><div className="space-y-2 sm:col-span-2"><Label htmlFor="description">Descrição</Label><Textarea id="description" value={form.description} onChange={(event) => update("description", event.target.value)} minLength={20} rows={5} required /></div><DateTimeField label="Início" id="startsAt" value={form.startsAt} onChange={(value) => update("startsAt", value)} /><DateTimeField label="Fim" id="endsAt" value={form.endsAt} onChange={(value) => update("endsAt", value)} /></div><div className="border-t border-white/8 pt-6"><h3 className="mb-4 text-sm font-medium text-white">Endereço do local</h3><div className="grid gap-4 sm:grid-cols-6"><div className="sm:col-span-2"><EditorField label="CEP" id="postalCode" value={formatCep(form.postalCode)} onChange={updatePostalCode} />{cepStatus === "loading" && <p className="mt-1 flex items-center gap-1 text-[11px] text-muted-foreground"><LoaderCircle className="size-3 animate-spin" /> Consultando endereço...</p>}{cepError && <p className={`mt-1 text-[11px] ${cepStatus === "unavailable" ? "text-amber-300" : "text-destructive"}`} role="alert">{cepError}</p>}</div><div className="sm:col-span-4"><EditorField label="Rua" id="street" value={form.street} onChange={(value) => update("street", value)} /></div><div className="sm:col-span-2"><EditorField label="Número" id="number" value={form.number} onChange={(value) => update("number", value)} /></div><div className="sm:col-span-4"><EditorField label="Complemento" id="complement" value={form.complement} onChange={(value) => update("complement", value)} required={false} /></div><div className="sm:col-span-2"><EditorField label="Bairro" id="district" value={form.district} onChange={(value) => update("district", value)} /></div><div className="sm:col-span-3"><EditorField label="Cidade" id="city" value={form.city} onChange={(value) => update("city", value)} /></div><div className="sm:col-span-1"><EditorField label="UF" id="state" value={form.state} onChange={(value) => update("state", value.toUpperCase().slice(0, 2))} /></div></div></div></fieldset>{error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}{editable && <div className="flex justify-end"><Button type="submit" disabled={busy || cepStatus === "loading"}>{busy && <LoaderCircle className="animate-spin" />}{editing ? "Salvar alterações" : "Criar rascunho"}</Button></div>}</form></CardContent></Card>;
}

function TicketTypesPanel({ event, editable, onChange }: { event: OrganizerEvent; editable: boolean; onChange: () => Promise<void> }) {
  const capacityEditable = editable || event.status === "PUBLISHED";
  return <div className="grid gap-6 xl:grid-cols-[1fr_340px]"><div className="space-y-3">{event.ticketTypes?.length ? event.ticketTypes.map((ticket) => <TicketTypeRow key={ticket.id} event={event} ticket={ticket} editable={editable} capacityEditable={capacityEditable} onChange={onChange} />) : <StatePanel kind="empty" title="Nenhum tipo de ingresso" description="Crie ao menos um tipo ativo antes de enviar o evento para análise." />}</div>{editable && <CreateTicketType event={event} onChange={onChange} />}</div>;
}

type OrganizerTicketType = NonNullable<OrganizerEvent["ticketTypes"]>[number];

function TicketTypeRow({ event, ticket, editable, capacityEditable, onChange }: { event: OrganizerEvent; ticket: OrganizerTicketType; editable: boolean; capacityEditable: boolean; onChange: () => Promise<void> }) {
  const [capacity, setCapacity] = useState(String(ticket.capacity)); const [busy, setBusy] = useState(false); const [editOpen, setEditOpen] = useState(false);
  async function saveCapacity() { setBusy(true); const { error } = await api.PATCH("/api/v1/organizer/events/{eventId}/ticket-types/{ticketTypeId}/capacity", { params: { path: { eventId: event.id, ticketTypeId: ticket.id } }, body: { capacity: Number(capacity) } }); if (error) toast.error(problemMessage(error)); else { toast.success("Capacidade atualizada."); await onChange(); } setBusy(false); }
  async function toggleActive() { setBusy(true); const { error } = await api.PATCH("/api/v1/organizer/events/{eventId}/ticket-types/{ticketTypeId}", { params: { path: { eventId: event.id, ticketTypeId: ticket.id } }, body: { active: !ticket.active } }); if (error) toast.error(problemMessage(error)); else await onChange(); setBusy(false); }
  return <><Card><CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center"><span className="grid size-11 place-items-center rounded-xl bg-primary/8 text-primary"><Ticket /></span><div className="flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-medium text-white">{ticket.name}</h3><Badge variant={ticket.active ? "default" : "secondary"}>{ticket.active ? "Ativo" : "Inativo"}</Badge></div><p className="mt-1 text-xs text-muted-foreground">{formatMoney(ticket.priceCents)} · até {ticket.maxPerOrder} por pedido{ticket.saleStartsAt ? ` · vendas desde ${formatDateTime(ticket.saleStartsAt)}` : ""}</p></div><div className="flex flex-wrap items-end gap-2"><div className="space-y-1"><Label htmlFor={`capacity-${ticket.id}`} className="text-[11px]">Capacidade</Label><Input id={`capacity-${ticket.id}`} type="number" min={0} value={capacity} onChange={(eventValue) => setCapacity(eventValue.target.value)} className="w-24" disabled={!capacityEditable || busy} /></div><Button variant="outline" onClick={saveCapacity} disabled={!capacityEditable || busy}>Salvar</Button>{editable && <><Button variant="ghost" size="icon" aria-label={`Editar ${ticket.name}`} onClick={() => setEditOpen(true)} disabled={busy}><Pencil /></Button><Button variant="ghost" onClick={toggleActive} disabled={busy}>{ticket.active ? "Desativar" : "Ativar"}</Button></>}</div></CardContent></Card>{editOpen && <EditTicketType key={ticket.updatedAt} event={event} ticket={ticket} open onOpenChange={setEditOpen} onChange={onChange} />}</>;
}

function EditTicketType({ event, ticket, open, onOpenChange, onChange }: { event: OrganizerEvent; ticket: OrganizerTicketType; open: boolean; onOpenChange: (open: boolean) => void; onChange: () => Promise<void> }) {
  const [form, setForm] = useState({ name: ticket.name, description: ticket.description ?? "", price: String(ticket.priceCents / 100).replace(".", ","), maxPerOrder: String(ticket.maxPerOrder), saleStartsAt: ticket.saleStartsAt ? toInput(ticket.saleStartsAt) : "", saleEndsAt: ticket.saleEndsAt ? toInput(ticket.saleEndsAt) : "" });
  const [busy, setBusy] = useState(false);
  async function submit(eventSubmit: FormEvent) { eventSubmit.preventDefault(); const priceCents = parsePriceCents(form.price); if (Number.isNaN(priceCents)) { toast.error("Informe um preço válido. Ex.: 49,90"); return; } setBusy(true); const { error } = await api.PATCH("/api/v1/organizer/events/{eventId}/ticket-types/{ticketTypeId}", { params: { path: { eventId: event.id, ticketTypeId: ticket.id } }, body: { name: form.name, description: form.description || null, priceCents, maxPerOrder: Number(form.maxPerOrder), saleStartsAt: form.saleStartsAt ? new Date(form.saleStartsAt).toISOString() : null, saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : null } }); if (error) toast.error(problemMessage(error)); else { toast.success("Ingresso atualizado."); onOpenChange(false); await onChange(); } setBusy(false); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="sm:max-w-lg"><form onSubmit={submit}><DialogHeader><DialogTitle>Editar tipo de ingresso</DialogTitle><DialogDescription>A capacidade é ajustada separadamente para preservar o estoque.</DialogDescription></DialogHeader><div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><EditorField label="Nome" id={`edit-ticket-name-${ticket.id}`} value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} /></div><div className="sm:col-span-2"><EditorField label="Descrição" id={`edit-ticket-description-${ticket.id}`} value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} required={false} /></div><EditorField label="Preço (R$)" id={`edit-ticket-price-${ticket.id}`} inputMode="decimal" placeholder="49,90" value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} /><EditorField label="Máx. por pedido" id={`edit-ticket-max-${ticket.id}`} type="number" value={form.maxPerOrder} onChange={(value) => setForm((current) => ({ ...current, maxPerOrder: value }))} /><div className="sm:col-span-2"><DateTimeField label="Início das vendas" id={`edit-ticket-start-${ticket.id}`} value={form.saleStartsAt} onChange={(value) => setForm((current) => ({ ...current, saleStartsAt: value }))} required={false} /></div><div className="sm:col-span-2"><DateTimeField label="Fim das vendas" id={`edit-ticket-end-${ticket.id}`} value={form.saleEndsAt} onChange={(value) => setForm((current) => ({ ...current, saleEndsAt: value }))} required={false} /></div></div><DialogFooter className="mt-5"><Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={busy}>{busy ? "Salvando..." : "Salvar ingresso"}</Button></DialogFooter></form></DialogContent></Dialog>;
}

function CreateTicketType({ event, onChange }: { event: OrganizerEvent; onChange: () => Promise<void> }) {
  const initial = { name: "", description: "", price: "", capacity: "", maxPerOrder: "10", saleStartsAt: "", saleEndsAt: "" }; const [form, setForm] = useState(initial); const [busy, setBusy] = useState(false);
  async function submit(eventSubmit: FormEvent) { eventSubmit.preventDefault(); const priceCents = parsePriceCents(form.price); if (Number.isNaN(priceCents)) { toast.error("Informe um preço válido. Ex.: 49,90"); return; } setBusy(true); const { error } = await api.POST("/api/v1/organizer/events/{id}/ticket-types", { params: { path: { id: event.id } }, body: { name: form.name, description: form.description || undefined, priceCents, capacity: Number(form.capacity), maxPerOrder: Number(form.maxPerOrder), saleStartsAt: form.saleStartsAt ? new Date(form.saleStartsAt).toISOString() : undefined, saleEndsAt: form.saleEndsAt ? new Date(form.saleEndsAt).toISOString() : undefined } }); if (error) toast.error(problemMessage(error)); else { toast.success("Tipo de ingresso criado."); setForm(initial); await onChange(); } setBusy(false); }
  return <Card className="h-fit"><CardHeader><CardTitle className="text-base">Novo tipo</CardTitle></CardHeader><CardContent><form onSubmit={submit} className="space-y-4"><EditorField label="Nome" id="ticket-name" value={form.name} onChange={(value) => setForm((current) => ({ ...current, name: value }))} /><EditorField label="Descrição" id="ticket-description" value={form.description} onChange={(value) => setForm((current) => ({ ...current, description: value }))} required={false} /><div className="grid gap-3 sm:grid-cols-2"><EditorField label="Preço (R$)" id="ticket-price" inputMode="decimal" placeholder="49,90" value={form.price} onChange={(value) => setForm((current) => ({ ...current, price: value }))} /><EditorField label="Capacidade" id="ticket-capacity" type="number" value={form.capacity} onChange={(value) => setForm((current) => ({ ...current, capacity: value }))} /><EditorField label="Máx. por pedido" id="ticket-max" type="number" value={form.maxPerOrder} onChange={(value) => setForm((current) => ({ ...current, maxPerOrder: value }))} /><div className="sm:col-span-2"><DateTimeField label="Início das vendas" id="ticket-sale-start" value={form.saleStartsAt} onChange={(value) => setForm((current) => ({ ...current, saleStartsAt: value }))} required={false} /></div><div className="sm:col-span-2"><DateTimeField label="Fim das vendas" id="ticket-sale-end" value={form.saleEndsAt} onChange={(value) => setForm((current) => ({ ...current, saleEndsAt: value }))} required={false} /></div></div><Button type="submit" className="w-full" disabled={busy}><Plus /> {busy ? "Criando..." : "Criar ingresso"}</Button></form></CardContent></Card>;
}

function MediaPanel({ event, editable, onChange }: { event: OrganizerEvent; editable: boolean; onChange: () => Promise<void> }) {
  const images = event.images ?? []; const cover = images.find((image) => image.kind === "COVER"); const gallery = images.filter((image) => image.kind === "GALLERY").sort((a, b) => a.position - b.position); const [busy, setBusy] = useState(false);
  async function upload(file: File, kind: "cover" | "gallery") { setBusy(true); const formData = new FormData(); formData.set("file", file); const endpoint = kind === "cover" ? "/api/v1/organizer/events/{id}/images/cover" as const : "/api/v1/organizer/events/{id}/images/gallery" as const; const result = await api.POST(endpoint, { params: { path: { id: event.id } }, body: { file: file.name }, bodySerializer: () => formData }); if (result.error) toast.error(problemMessage(result.error)); else { toast.success("Imagem enviada."); await onChange(); } setBusy(false); }
  async function remove(imageId: string) { setBusy(true); const { error } = await api.DELETE("/api/v1/organizer/events/{eventId}/images/{imageId}", { params: { path: { eventId: event.id, imageId } } }); if (error) toast.error(problemMessage(error)); else await onChange(); setBusy(false); }
  async function move(index: number, delta: number) { const reordered = [...gallery]; const target = index + delta; if (target < 0 || target >= reordered.length) return; [reordered[index], reordered[target]] = [reordered[target], reordered[index]]; const { error } = await api.PATCH("/api/v1/organizer/events/{eventId}/images/order", { params: { path: { eventId: event.id } }, body: { imageIds: reordered.map((image) => image.id) } }); if (error) toast.error(problemMessage(error)); else await onChange(); }
  return <div className="space-y-6"><Card><CardHeader><CardTitle className="text-base">Capa do evento</CardTitle></CardHeader><CardContent>{cover?.url ? <div className="relative aspect-[16/6] overflow-hidden rounded-xl"><Image src={cover.url} alt="Capa atual" fill className="object-cover" sizes="100vw" />{editable && <Button variant="destructive" size="icon" className="absolute right-3 top-3" aria-label="Remover capa" onClick={() => remove(cover.id)}><Trash2 /></Button>}</div> : <UploadDropzone label="Enviar capa" disabled={!editable || busy} onFile={(file) => upload(file, "cover")} />}</CardContent></Card><Card><CardHeader><CardTitle className="text-base">Galeria <Badge variant="secondary">{gallery.length}/6</Badge></CardTitle></CardHeader><CardContent><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{gallery.map((image, index) => <div key={image.id} className="relative aspect-video overflow-hidden rounded-xl border border-white/8">{image.url && <Image src={image.url} alt={`Imagem ${index + 1}`} fill className="object-cover" sizes="33vw" />} {editable && <div className="absolute bottom-2 right-2 flex gap-1"><Button size="icon-xs" variant="secondary" aria-label={`Mover imagem ${index + 1} para cima`} onClick={() => move(index, -1)} disabled={index === 0}><ArrowUp /></Button><Button size="icon-xs" variant="secondary" aria-label={`Mover imagem ${index + 1} para baixo`} onClick={() => move(index, 1)} disabled={index === gallery.length - 1}><ArrowDown /></Button><Button size="icon-xs" variant="destructive" aria-label={`Remover imagem ${index + 1}`} onClick={() => remove(image.id)}><Trash2 /></Button></div>}</div>)}{gallery.length < 6 && <UploadDropzone label="Adicionar à galeria" disabled={!editable || busy} onFile={(file) => upload(file, "gallery")} />}</div></CardContent></Card></div>;
}

function UploadDropzone({ label, disabled, onFile }: { label: string; disabled: boolean; onFile: (file: File) => void }) { return <label className="flex aspect-video cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-white/14 bg-white/[.02] text-center hover:border-primary/35"><ImagePlus className="size-5 text-primary" /><span className="mt-2 text-sm text-white">{label}</span><small className="mt-1 text-[11px] text-muted-foreground">JPG, PNG ou WebP · até 5 MB</small><Input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={disabled} onChange={(event) => { const file = event.target.files?.[0]; if (file) onFile(file); }} /></label>; }

function StaffPanel({ event }: { event: OrganizerEvent }) {
  const [items, setItems] = useState<StaffInvitation[]>([]); const [email, setEmail] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false);
  const load = useCallback(async () => { const { data, error } = await api.GET("/api/v1/organizer/events/{eventId}/staff-invitations", { params: { path: { eventId: event.id } } }); if (error) toast.error(problemMessage(error)); setItems(data ?? []); setLoading(false); }, [event.id]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function invite(eventSubmit: FormEvent) { eventSubmit.preventDefault(); setBusy(true); const { error } = await api.POST("/api/v1/organizer/events/{eventId}/staff-invitations", { params: { path: { eventId: event.id } }, body: { email } }); if (error) toast.error(problemMessage(error)); else { toast.success("Convite enviado."); setEmail(""); await load(); } setBusy(false); }
  async function revoke(invitationId: string) { setBusy(true); const { error } = await api.POST("/api/v1/organizer/events/{eventId}/staff-invitations/{invitationId}/revoke", { params: { path: { eventId: event.id, invitationId } } }); if (error) toast.error(problemMessage(error)); else await load(); setBusy(false); }
  return <div className="grid gap-6 xl:grid-cols-[1fr_340px]"><Card><CardHeader><CardTitle className="text-base">Equipe convidada</CardTitle></CardHeader><CardContent>{loading ? <StatePanel kind="loading" /> : items.length === 0 ? <StatePanel kind="empty" title="Nenhum convite" description="Convide quem fará a validação de QR na entrada." /> : <div className="space-y-3">{items.map((item) => <div key={item.id} className="flex items-center gap-4 rounded-xl border border-white/8 p-4"><span className="grid size-10 place-items-center rounded-xl bg-primary/8 text-primary"><UserPlus /></span><div className="min-w-0 flex-1"><p className="truncate text-sm text-white">{item.email}</p><p className="mt-1 text-xs text-muted-foreground">Expira em {formatDateTime(item.expiresAt)}</p></div><Badge variant="secondary">{invitationStatusLabels[item.status]}</Badge>{item.status === "PENDING" && <Button variant="destructive" size="sm" onClick={() => revoke(item.id)} disabled={busy}>Revogar</Button>}</div>)}</div>}</CardContent></Card><Card className="h-fit"><CardHeader><CardTitle className="text-base">Convidar portaria</CardTitle></CardHeader><CardContent><form onSubmit={invite} className="space-y-4"><EditorField label="E-mail" id="staff-email" type="email" value={email} onChange={setEmail} /><Button type="submit" className="w-full" disabled={busy}><UserPlus /> {busy ? "Enviando..." : "Enviar convite"}</Button></form></CardContent></Card></div>;
}

function DateTimeField({ label, id, value, onChange, required = true }: { label: string; id: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  const initial = splitDateTime(value);
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  function update(nextDate: string, nextTime: string) {
    setDate(nextDate);
    setTime(nextTime);
    onChange(nextDate && nextTime ? `${nextDate}T${nextTime}` : "");
  }

  return <div className="space-y-2"><p className="text-sm leading-none font-medium">{label}</p><div className="grid grid-cols-[minmax(0,1.35fr)_minmax(6.5rem,0.65fr)] gap-2"><div className="space-y-1"><Label htmlFor={`${id}-date`} className="text-xs font-normal text-muted-foreground">Data</Label><Input id={`${id}-date`} type="date" value={date} onChange={(event) => update(event.target.value, time)} required={required} aria-label={`Data de ${label.toLowerCase()}`} /></div><div className="space-y-1"><Label htmlFor={`${id}-time`} className="text-xs font-normal text-muted-foreground">Hora</Label><Input id={`${id}-time`} type="time" value={time} onChange={(event) => update(date, event.target.value)} required={required} step={60} aria-label={`Hora de ${label.toLowerCase()}`} /></div></div></div>;
}

function splitDateTime(value: string) {
  const [date = "", time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

function EditorField({ label, id, value, onChange, type = "text", required = true, ...props }: { label: string; id: string; value: string; onChange: (value: string) => void; type?: string; required?: boolean } & Omit<ComponentProps<typeof Input>, "id" | "value" | "onChange" | "type" | "required">) { return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} type={type} value={value} onChange={(event) => onChange(event.target.value)} required={required} {...props} /></div>; }
function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }
function parsePriceCents(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return NaN;
  const normalized = trimmed.includes(",") ? trimmed.replace(/\./g, "").replace(",", ".") : trimmed;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed * 100) : NaN;
}
function toInput(value: string) { const date = new Date(value); const offset = date.getTimezoneOffset() * 60_000; return new Date(date.getTime() - offset).toISOString().slice(0, 16); }
function fromEvent(event: OrganizerEvent): EventForm { return { categoryId: event.categoryId, title: event.title, slug: event.slug, description: event.description, venueName: event.venueName, postalCode: normalizeCep(event.postalCode), street: event.street, number: event.number, complement: event.complement ?? "", district: event.district, city: event.city, state: event.state, startsAt: toInput(event.startsAt), endsAt: toInput(event.endsAt), timezone: event.timezone }; }
