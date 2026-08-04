"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, MapPin, Ticket } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { EventSummary } from "@/lib/api/types";
import { formatMoney } from "@/lib/format";

const FALLBACK_COVERS = ["/images/Event_1.png", "/images/Event_2.png", "/images/Event_3.png"];

function circularOffset(index: number, activeIndex: number, length: number) {
  let offset = index - activeIndex;
  if (offset > length / 2) offset -= length;
  if (offset < -length / 2) offset += length;
  return offset;
}

function formatEventRange(startsAt: string, endsAt: string) {
  const start = new Date(startsAt);
  const end = new Date(endsAt);
  const date = new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    timeZone: "America/Sao_Paulo",
  });
  const time = new Intl.DateTimeFormat("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Sao_Paulo",
  });
  const sameDay = start.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) === end.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });

  return sameDay
    ? `${date.format(start)} · ${time.format(start)}`
    : `${date.format(start)} — ${date.format(end)}`;
}

function lowestPrice(event: EventSummary) {
  return event.ticketTypes.reduce<number | undefined>((lowest, ticket) => {
    if (!ticket.active) return lowest;
    return lowest === undefined ? ticket.priceCents : Math.min(lowest, ticket.priceCents);
  }, undefined);
}

function HeroCover({
  src,
  fallback,
  alt,
  priority,
}: {
  src?: string;
  fallback: string;
  alt: string;
  priority?: boolean;
}) {
  const [invalidSource, setInvalidSource] = useState<string>();
  const resolvedSource = src && invalidSource !== src ? src : fallback;

  return (
    <Image
      src={resolvedSource}
      alt={alt}
      fill
      priority={priority}
      sizes="(max-width: 640px) 92vw, (max-width: 1280px) 74vw, 920px"
      className="object-cover transition-transform duration-300 ease-out group-hover:scale-[1.018] motion-reduce:transition-none"
      onError={() => src && setInvalidSource(src)}
      onLoad={(event) => {
        if (src && (event.currentTarget.naturalWidth < 64 || event.currentTarget.naturalHeight < 64)) {
          setInvalidSource(src);
        }
      }}
    />
  );
}

export function HeroCarousel({ events }: { events: EventSummary[] }) {
  const slides = events.slice(0, 7);
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const normalizedIndex = slides.length ? activeIndex % slides.length : 0;
  const activeEvent = slides[normalizedIndex] ?? slides[0];

  function move(direction: -1 | 1) {
    setActiveIndex((current) => {
      if (slides.length < 2) return 0;
      return (current + direction + slides.length) % slides.length;
    });
  }

  function selectSlide(index: number) {
    setActiveIndex(index);
  }

  useEffect(() => {
    if (paused || slides.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const slideCount = slides.length;
    const timer = window.setTimeout(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, 6500);
    return () => window.clearTimeout(timer);
  }, [normalizedIndex, paused, slides.length]);

  if (!activeEvent) {
    return (
      <div className="relative mx-auto mt-10 aspect-[16/8] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-white/10 bg-card">
        <Image src="/images/Event_1.png" alt="Público celebrando em um evento" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/15" />
      </div>
    );
  }

  const activePrice = lowestPrice(activeEvent);

  return (
    <div
      className="rounded-[2rem] outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4 focus-visible:ring-offset-background"
      role="region"
      aria-label="Eventos em destaque"
      aria-roledescription="carrossel"
      tabIndex={0}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          move(-1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          move(1);
        }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="relative mx-auto h-[clamp(270px,min(36vw,55svh),580px)] max-w-[1280px] overflow-x-clip">
        {slides.length === 1 ? (
          <>
            <div aria-hidden="true" className="absolute left-[1%] top-1/2 hidden h-[72%] w-[48%] -translate-y-1/2 -rotate-2 overflow-hidden rounded-[1.7rem] opacity-45 smooth-shadow-ring-lg smooth-ring-white/10 sm:block">
              <Image src="/images/Event_2.png" alt="" fill sizes="48vw" className="object-cover" />
              <div className="absolute inset-0 bg-background/25" />
            </div>
            <div aria-hidden="true" className="absolute right-[1%] top-1/2 hidden h-[72%] w-[48%] -translate-y-1/2 rotate-2 overflow-hidden rounded-[1.7rem] opacity-45 smooth-shadow-ring-lg smooth-ring-white/10 sm:block">
              <Image src="/images/Event_3.png" alt="" fill sizes="48vw" className="object-cover" />
              <div className="absolute inset-0 bg-background/25" />
            </div>
          </>
        ) : null}

        {slides.map((event, index) => {
          const offset = circularOffset(index, normalizedIndex, slides.length);
          const distance = Math.abs(offset);
          const isActive = offset === 0;
          const scale = isActive ? 1 : Math.max(0.76, 0.9 - distance * 0.08);
          const cover = event.images.find((image) => image.kind === "COVER")?.url;
          const card = (
            <>
              <HeroCover src={cover} fallback={FALLBACK_COVERS[index % FALLBACK_COVERS.length]} alt={isActive ? `Capa do evento ${event.title}` : ""} priority={index === 0} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/25" />
              {isActive ? (
                <>
                  <Badge className="absolute left-4 top-4 border border-white/15 bg-black/45 text-white backdrop-blur-md sm:left-6 sm:top-6">
                    {event.category.name}
                  </Badge>
                  <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/50 px-4 py-2 text-xs font-medium text-white backdrop-blur-md sm:bottom-6 sm:right-6">
                    Ver evento <ArrowRight className="size-3.5" />
                  </span>
                </>
              ) : null}
            </>
          );

          return (
            <div
              key={event.id}
              aria-hidden={!isActive}
              data-active={isActive}
              className={`hero-carousel-card group transform-gpu absolute left-1/2 top-1/2 block h-full w-[92%] overflow-hidden rounded-[1.7rem] bg-card smooth-shadow-ring-xl ${isActive ? "smooth-ring-primary/35" : "smooth-ring-white/10"} transition-[transform,opacity] duration-500 ease-[cubic-bezier(.22,1,.36,1)] motion-reduce:transition-none sm:w-[74%]`}
              style={{
                zIndex: 30 - distance,
                opacity: isActive ? 1 : distance === 1 ? 0.42 : 0,
                pointerEvents: isActive || distance === 1 ? "auto" : "none",
                transform: `translate3d(-50%, -50%, 0) translate3d(${offset * 42}%, 0, 0) scale3d(${scale}, ${scale}, 1)`,
                transformOrigin: "center center",
                willChange: isActive || distance === 1 ? "transform, opacity" : "auto",
              }}
            >
              <Link
                href={`/eventos/${event.slug}`}
                tabIndex={isActive ? 0 : -1}
                aria-label={isActive ? `Ver detalhes de ${event.title}` : `Destacar ${event.title}`}
                onClick={(clickEvent) => {
                  if (isActive) return;
                  clickEvent.preventDefault();
                  selectSlide(index);
                }}
                className="block size-full cursor-pointer"
              >
                {card}
              </Link>
            </div>
          );
        })}

        {slides.length > 1 ? (
          <>
            <button
              type="button"
              aria-label="Evento anterior"
              onClick={() => move(-1)}
              className="absolute left-1 top-1/2 z-40 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-background/85 text-secondary-foreground shadow-xl outline-none backdrop-blur-md transition-[background-color,border-color,color,box-shadow] hover:bg-secondary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none sm:left-4"
            >
              <ArrowLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Próximo evento"
              onClick={() => move(1)}
              className="absolute right-1 top-1/2 z-40 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-full border border-white/10 bg-background/85 text-secondary-foreground shadow-xl outline-none backdrop-blur-md transition-[background-color,border-color,color,box-shadow] hover:bg-secondary focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 motion-reduce:transition-none sm:right-4"
            >
              <ArrowRight className="size-4" />
            </button>
          </>
        ) : null}
      </div>

      <div className="mx-auto mt-3 flex min-h-6 items-center justify-center gap-1" aria-label={`${normalizedIndex + 1} de ${slides.length}`}>
        {slides.map((event, index) => (
          <button
            key={event.id}
            type="button"
            onClick={() => selectSlide(index)}
            aria-label={`Ir para ${event.title}`}
            aria-current={index === normalizedIndex ? "true" : undefined}
            className="group relative grid size-6 place-items-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background motion-reduce:transition-none"
          >
            <span aria-hidden="true" className={`block h-1.5 rounded-full transition-[background-color,width] motion-reduce:transition-none ${index === normalizedIndex ? "w-8 bg-primary" : "w-1.5 bg-white/20 group-hover:w-2 group-hover:bg-white/45"}`} />
          </button>
        ))}
      </div>

      <div key={activeEvent.id} aria-live="polite" className="animate-in fade-in mx-auto mt-2 max-w-4xl px-4 text-center duration-200 motion-reduce:animate-none">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Em destaque na Pulso</p>
        <h2 className="mt-1 text-balance text-xl font-semibold tracking-[-0.045em] text-white sm:text-3xl">{activeEvent.title}</h2>
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-xs text-muted-foreground sm:text-sm">
          <span className="inline-flex items-center gap-1.5"><MapPin className="size-4 text-cyan-300" /> {activeEvent.venueName} · {activeEvent.city}, {activeEvent.state}</span>
          <span className="inline-flex items-center gap-1.5"><CalendarDays className="size-4 text-cyan-300" /> {formatEventRange(activeEvent.startsAt, activeEvent.endsAt)}</span>
          <span className="inline-flex items-center gap-1.5"><Ticket className="size-4 text-cyan-300" /> {activeEvent.soldOut ? "Esgotado" : activePrice === undefined ? "Em breve" : `A partir de ${formatMoney(activePrice)}`}</span>
        </div>
      </div>
    </div>
  );
}
