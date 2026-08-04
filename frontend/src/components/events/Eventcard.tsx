import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { EventSummary } from "@/lib/api/types";
import { formatMoney, formatShortDate } from "@/lib/format";

export function EventCard({ event, priority = false }: { event: EventSummary; priority?: boolean }) {
  const cover = event.images.find((image) => image.kind === "COVER")?.url;
  const lowestPrice = event.ticketTypes.filter((ticket) => ticket.active).sort((a, b) => a.priceCents - b.priceCents)[0];

  return (
    <Card className="group overflow-hidden bg-card/72 p-0 transition-[box-shadow,transform] duration-300 hover:-translate-y-1 hover:smooth-shadow-ring-lg hover:smooth-ring-primary/35">
      <Link href={`/eventos/${event.slug}`} className="block">
        <div className="relative aspect-[16/10] overflow-hidden bg-muted">
          <Image
            src={cover ?? "/images/Event_1.png"}
            alt={`Capa do evento ${event.title}`}
            fill
            priority={priority}
            className="object-cover transition duration-500 group-hover:scale-[1.04]"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/5 to-transparent" />
          <Badge className="absolute left-3 top-3 border-white/15 bg-black/55 text-white backdrop-blur-md">{event.category.name}</Badge>
          {event.soldOut && <Badge variant="destructive" className="absolute right-3 top-3">Esgotado</Badge>}
          <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-xs font-medium text-white backdrop-blur-md">
            {formatShortDate(event.startsAt)}
          </div>
        </div>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h3 className="line-clamp-2 text-lg font-semibold tracking-[-0.025em] text-white">{event.title}</h3>
              <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" />
                <span className="truncate">{event.venueName} · {event.city}, {event.state}</span>
              </p>
            </div>
            <ArrowUpRight className="mt-1 size-4 shrink-0 text-muted-foreground transition group-hover:text-primary" />
          </div>
          <div className="mt-5 flex items-end justify-between border-t border-white/8 pt-4">
            <span className="text-xs text-muted-foreground">{event.soldOut ? "Vendas encerradas" : "Ingressos a partir de"}</span>
            {!event.soldOut && <strong className="text-sm font-semibold text-primary">{lowestPrice ? formatMoney(lowestPrice.priceCents) : "Em breve"}</strong>}
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
