"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, Clock3, MapPin, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { TicketSelection, TicketSelector } from "@/components/events/TicketSelector";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { api } from "@/lib/api/client";
import { asProblem, problemMessage } from "@/lib/api/problem";
import type { PublicEvent } from "@/lib/api/types";
import { formatAddress, formatDateTime } from "@/lib/format";

export function EventDetails({ slug }: { slug: string }) {
  const [event, setEvent] = useState<PublicEvent>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [activeCheckoutId, setActiveCheckoutId] = useState<string>();
  const idempotencyKey = useRef<string | undefined>(undefined);

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const { data, error: apiError } = await api.GET("/api/v1/events/{slug}", { params: { path: { slug } } });
    if (apiError) setError(problemMessage(apiError, "Evento não encontrado."));
    setEvent(data);
    setLoading(false);
  }, [slug]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  async function startCheckout(selection: TicketSelection) {
    if (!event) return;
    setBusy(true);
    idempotencyKey.current ??= crypto.randomUUID();
    const items = Object.entries(selection).filter(([, quantity]) => quantity > 0).map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }));
    const { data, error: apiError } = await api.POST("/api/v1/checkouts", {
      params: { header: { "idempotency-key": idempotencyKey.current } },
      body: { eventId: event.id, items },
    });
    if (data) {
      window.location.assign(`/checkout/${data.id}`);
      return;
    }
    const problem = asProblem(apiError);
    if (problem?.code === "EMAIL_NOT_VERIFIED") window.location.assign("/verificar-email");
    else if (problem?.code === "PROFILE_INCOMPLETE") window.location.assign("/perfil?complete=1");
    else if (problem?.code === "ACTIVE_CHECKOUT_EXISTS" && problem.activeCheckoutId) setActiveCheckoutId(problem.activeCheckoutId);
    else if (problem?.status === 401) window.location.assign(`/entrar?redirect=${encodeURIComponent(`/eventos/${slug}`)}`);
    else toast.error(problemMessage(apiError, "Não foi possível reservar os ingressos."));
    setBusy(false);
  }

  async function cancelActive() {
    if (!activeCheckoutId) return;
    const { error: apiError } = await api.POST("/api/v1/checkouts/{id}/cancel", { params: { path: { id: activeCheckoutId } } });
    if (apiError) toast.error(problemMessage(apiError));
    else {
      toast.success("Checkout anterior cancelado.");
      setActiveCheckoutId(undefined);
      idempotencyKey.current = undefined;
    }
  }

  if (loading) return <main className="content-grid py-12"><StatePanel kind="loading" description="Preparando os detalhes e a disponibilidade." /></main>;
  if (error || !event) return <main className="content-grid py-12"><StatePanel kind="error" title="Evento indisponível" description={error} action={{ label: "Voltar aos eventos", onClick: () => window.location.assign("/") }} /></main>;

  const cover = event.images.find((image) => image.kind === "COVER")?.url;
  const gallery = event.images.filter((image) => image.kind === "GALLERY" && image.url);

  return (
    <main className="pb-20">
      <section className="relative isolate overflow-hidden border-b border-white/8">
        <div className="absolute inset-0 -z-20">
          <Image src={cover ?? "/images/Event_1.png"} alt="" fill priority className="object-cover opacity-35 blur-[2px]" sizes="100vw" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/75 to-background/35" />
        </div>
        <div className="content-grid py-8 sm:py-12">
          <Button variant="ghost" asChild className="mb-8 -ml-3 text-muted-foreground"><Link href="/"><ChevronLeft /> Voltar aos eventos</Link></Button>
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_1.08fr]">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl bg-card smooth-shadow-ring-md smooth-ring-white/10 shadow-black/30">
              <Image src={cover ?? "/images/Event_1.png"} alt={`Capa de ${event.title}`} fill priority className="object-cover" sizes="(max-width:1024px) 100vw, 50vw" />
            </div>
            <div className="pb-2">
              <div className="flex flex-wrap gap-2"><Badge>{event.category.name}</Badge>{event.soldOut && <Badge variant="destructive">Esgotado</Badge>}</div>
              <h1 className="text-balance mt-5 text-4xl font-semibold leading-none tracking-[-0.055em] text-white sm:text-5xl lg:text-6xl">{event.title}</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-white/66">{event.description}</p>
              <div className="mt-7 grid gap-3 text-sm text-white/76 sm:grid-cols-2">
                <span className="flex items-center gap-2.5"><CalendarDays className="size-4 text-primary" /> {formatDateTime(event.startsAt, { dateStyle: "full", timeStyle: undefined })}</span>
                <span className="flex items-center gap-2.5"><Clock3 className="size-4 text-primary" /> {formatDateTime(event.startsAt, { dateStyle: undefined, timeStyle: "short" })}</span>
                <span className="flex items-center gap-2.5 sm:col-span-2"><MapPin className="size-4 text-primary" /> {formatAddress(event)}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="content-grid mt-10 grid gap-8 lg:grid-cols-[1fr_390px]">
        <div className="space-y-8">
          <div className="rounded-2xl border border-white/8 bg-card/58 p-6 sm:p-8">
            <div className="flex items-center gap-2 text-primary"><Sparkles className="size-4" /><span className="text-xs font-semibold uppercase tracking-[.2em]">Sobre a experiência</span></div>
            <h2 className="mt-4 text-2xl font-semibold tracking-[-0.035em] text-white">Tudo o que você precisa saber</h2>
            <p className="mt-4 whitespace-pre-line text-sm leading-7 text-muted-foreground">{event.description}</p>
          </div>

          {gallery.length > 0 && (
            <div>
              <h2 className="mb-4 text-xl font-semibold text-white">Um pouco do que vem por aí</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {gallery.map((image) => <div key={image.id} className="relative aspect-video overflow-hidden rounded-xl border border-white/8"><Image src={image.url!} alt={`Galeria de ${event.title}`} fill className="object-cover" sizes="50vw" /></div>)}
              </div>
            </div>
          )}

        </div>
        <TicketSelector event={event} busy={busy} onContinue={startCheckout} />
      </section>

      <AlertDialog open={Boolean(activeCheckoutId)} onOpenChange={(open) => !open && setActiveCheckoutId(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Você já tem uma reserva ativa</AlertDialogTitle>
            <AlertDialogDescription>Retome o checkout atual ou cancele a reserva anterior antes de escolher novos ingressos.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={cancelActive}>Cancelar reserva anterior</AlertDialogCancel>
            <AlertDialogAction asChild><Link href={`/checkout/${activeCheckoutId}`}>Retomar checkout</Link></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
