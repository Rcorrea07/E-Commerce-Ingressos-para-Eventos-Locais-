"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, KeyboardEvent, useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowRight, CalendarCheck2, ChevronDown, ChevronLeft, ChevronRight, LoaderCircle, MapPin, Search, ShieldCheck, TicketCheck } from "lucide-react";
import { EventCard } from "@/components/events/Eventcard";
import { HeroCarousel } from "@/components/home/HeroCarousel";
import { StatePanel } from "@/components/states/StatePanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api/client";
import type { Category, EventSummary } from "@/lib/api/types";
import { formatShortDate } from "@/lib/format";
import { problemMessage } from "@/lib/api/problem";

type CitySuggestion = { city: string; state: string };
type CatalogFilters = { search?: string; city?: string; categoryId?: string };

const CATALOG_PAGE_SIZE = 6;

export function HomeExperience() {
  const router = useRouter();
  const [events, setEvents] = useState<EventSummary[]>([]);
  const [featuredEvents, setFeaturedEvents] = useState<EventSummary[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState<EventSummary[]>([]);
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [city, setCity] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [citySuggestionsOpen, setCitySuggestionsOpen] = useState(false);
  const [citySuggestionsLoading, setCitySuggestionsLoading] = useState(false);
  const [activeCitySuggestion, setActiveCitySuggestion] = useState(-1);
  const skipNextCitySuggestionsRef = useRef(false);
  const paginationAnchorRef = useRef<HTMLElement | null>(null);
  const pendingPaginationTopRef = useRef<number | null>(null);
  const [categoryId, setCategoryId] = useState<string>();
  const [appliedFilters, setAppliedFilters] = useState<CatalogFilters>({});
  const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();

  useEffect(() => {
    const term = search.trim();
    if (term.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSuggestionsLoading(true);
      try {
        const { data } = await api.GET("/api/v1/events", {
          params: { query: { page: 1, pageSize: 5, sort: "startsAt", search: term, city: city.trim() || undefined } },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setSuggestions(data?.data ?? []);
        setSuggestionsOpen(true);
        setActiveSuggestion(-1);
      } catch {
        if (!controller.signal.aborted) {
          setSuggestions([]);
          setSuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setSuggestionsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [city, search]);

  useEffect(() => {
    const term = city.trim();
    if (term.length < 2) return;
    if (skipNextCitySuggestionsRef.current) {
      skipNextCitySuggestionsRef.current = false;
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setCitySuggestionsLoading(true);
      try {
        const { data } = await api.GET("/api/v1/events", {
          params: { query: { page: 1, pageSize: 100, sort: "startsAt", city: term } },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;

        const unique = new Map<string, CitySuggestion>();
        for (const event of data?.data ?? []) {
          const suggestion = { city: event.city.trim(), state: event.state.trim().toUpperCase() };
          unique.set(`${suggestion.city.toLocaleLowerCase("pt-BR")}::${suggestion.state}`, suggestion);
        }
        setCitySuggestions([...unique.values()].slice(0, 6));
        setCitySuggestionsOpen(true);
        setActiveCitySuggestion(-1);
      } catch {
        if (!controller.signal.aborted) {
          setCitySuggestions([]);
          setCitySuggestionsOpen(false);
        }
      } finally {
        if (!controller.signal.aborted) setCitySuggestionsLoading(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [city]);

  const loadEvents = useCallback(async (filters: CatalogFilters = {}, page = 1) => {
    setLoading(true);
    setError(undefined);
    const { data, error: apiError } = await api.GET("/api/v1/events", {
      params: { query: { page, pageSize: CATALOG_PAGE_SIZE, sort: "startsAt", ...filters } },
    });
    if (apiError) setError(problemMessage(apiError, "Não conseguimos carregar os eventos agora."));
    setEvents(data?.data ?? []);
    setPagination({
      page: data?.pagination.page ?? page,
      total: data?.pagination.total ?? 0,
      totalPages: data?.pagination.totalPages ?? 1,
    });
    setLoading(false);
  }, []);

  useEffect(() => {
    void Promise.all([
      Promise.resolve().then(() => loadEvents()),
      api.GET("/api/v1/events", {
        params: { query: { page: 1, pageSize: 7, sort: "startsAt" } },
      }).then(({ data }) => setFeaturedEvents(data?.data ?? [])),
      api.GET("/api/v1/categories").then(({ data }) => setCategories(data ?? [])),
    ]);
  }, [loadEvents]);

  function changeSearch(value: string) {
    setSearch(value);
    if (value.trim().length < 2) {
      setSuggestions([]);
      setSuggestionsOpen(false);
      setSuggestionsLoading(false);
      setActiveSuggestion(-1);
    }
  }

  function changeCity(value: string) {
    setCity(value);
    setActiveCitySuggestion(-1);
    if (value.trim().length < 2) {
      setCitySuggestions([]);
      setCitySuggestionsOpen(false);
      setCitySuggestionsLoading(false);
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    setSuggestionsOpen(false);
    const filters = { search: search.trim() || undefined, city: city.trim() || undefined, categoryId };
    setAppliedFilters(filters);
    void loadEvents(filters, 1);
    document.getElementById("eventos")?.scrollIntoView({ behavior: "smooth" });
  }

  function selectSuggestion(suggestion: EventSummary) {
    setSuggestionsOpen(false);
    setActiveSuggestion(-1);
    router.push(`/eventos/${suggestion.slug}`);
  }

  function selectCitySuggestion(suggestion: CitySuggestion) {
    skipNextCitySuggestionsRef.current = true;
    setCity(suggestion.city);
    setCitySuggestionsOpen(false);
    setActiveCitySuggestion(-1);
  }

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!suggestionsOpen || !suggestions.length) {
      if (event.key === "Escape") setSuggestionsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestion((current) => (current + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestion((current) => (current <= 0 ? suggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      const suggestion = suggestions[activeSuggestion];
      if (suggestion) selectSuggestion(suggestion);
    } else if (event.key === "Escape") {
      setSuggestionsOpen(false);
      setActiveSuggestion(-1);
    }
  }

  function handleCityKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (!citySuggestionsOpen || !citySuggestions.length) {
      if (event.key === "Escape") setCitySuggestionsOpen(false);
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveCitySuggestion((current) => (current + 1) % citySuggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveCitySuggestion((current) => (current <= 0 ? citySuggestions.length - 1 : current - 1));
    } else if (event.key === "Enter" && activeCitySuggestion >= 0) {
      event.preventDefault();
      const suggestion = citySuggestions[activeCitySuggestion];
      if (suggestion) selectCitySuggestion(suggestion);
    } else if (event.key === "Escape") {
      setCitySuggestionsOpen(false);
      setActiveCitySuggestion(-1);
    }
  }

  function chooseCategory(id?: string) {
    setCategoryId(id);
    const filters = { search: search.trim() || undefined, city: city.trim() || undefined, categoryId: id };
    setAppliedFilters(filters);
    void loadEvents(filters, 1);
  }

  function changePage(page: number) {
    if (page < 1 || page > pagination.totalPages || page === pagination.page) return;
    pendingPaginationTopRef.current = paginationAnchorRef.current?.getBoundingClientRect().top ?? null;
    void loadEvents(appliedFilters, page);
  }

  useLayoutEffect(() => {
    const previousTop = pendingPaginationTopRef.current;
    const anchor = paginationAnchorRef.current;
    if (loading || previousTop === null || !anchor) return;

    const offset = anchor.getBoundingClientRect().top - previousTop;
    if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: "auto" });
    pendingPaginationTopRef.current = null;
  }, [loading, pagination.page]);

  return (
    <main>
      <section className="relative z-20 isolate min-h-[calc(100svh-4rem)] border-b border-white/8">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20 overflow-hidden">
          <div className="brand-grid absolute inset-0 opacity-45" />
          <div className="absolute left-1/2 top-0 h-[34rem] w-[70rem] -translate-x-1/2 rounded-full bg-primary/12 blur-[130px]" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/15 via-background/55 to-background" />
        </div>

        <div className="px-3 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-5">
          <HeroCarousel events={featuredEvents} />

          <div className="content-grid mt-4">
            <form onSubmit={submit} className="smooth-shadow-ring-lg smooth-ring-primary/18 shadow-black/40 relative z-30 mx-auto grid max-w-4xl gap-2 rounded-2xl bg-black/45 p-2 backdrop-blur-xl sm:grid-cols-[1fr_1fr_auto]">
              <label className="relative">
                <Search className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => changeSearch(event.target.value)}
                  onFocus={() => { if (search.trim().length >= 2) setSuggestionsOpen(true); }}
                  onBlur={() => window.setTimeout(() => setSuggestionsOpen(false), 150)}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="Qual experiência você procura?"
                  className="h-12 border-0 bg-white/5 pl-10 shadow-none"
                  role="combobox"
                  aria-label="Buscar eventos"
                  aria-autocomplete="list"
                  aria-expanded={suggestionsOpen}
                  aria-controls="event-search-suggestions"
                  aria-activedescendant={activeSuggestion >= 0 ? `event-search-suggestion-${activeSuggestion}` : undefined}
                />
                {suggestionsOpen && (
                  <div id="event-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl bg-popover p-1.5 smooth-shadow-ring-md smooth-ring-white/10 shadow-black/40">
                    {suggestionsLoading ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground" role="status">
                        <LoaderCircle className="size-4 animate-spin" /> Buscando eventos...
                      </div>
                    ) : suggestions.length ? (
                      suggestions.map((suggestion, index) => (
                        <button
                          key={suggestion.id}
                          id={`event-search-suggestion-${index}`}
                          type="button"
                          role="option"
                          aria-selected={activeSuggestion === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveSuggestion(index)}
                          onClick={() => selectSuggestion(suggestion)}
                          className={`flex w-full items-start justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition ${activeSuggestion === index ? "bg-primary/15" : "hover:bg-white/6"}`}
                        >
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-white">{suggestion.title}</span>
                            <span className="mt-1 block truncate text-xs text-muted-foreground">{suggestion.city}, {suggestion.state}</span>
                          </span>
                          <span className="shrink-0 pt-0.5 text-xs text-primary">{formatShortDate(suggestion.startsAt)}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-sm text-muted-foreground">Nenhum evento correspondente.</p>
                    )}
                  </div>
                )}
              </label>
              <label className="relative z-20">
                <MapPin className="absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={city}
                  onChange={(event) => changeCity(event.target.value)}
                  onFocus={() => { if (city.trim().length >= 2) setCitySuggestionsOpen(true); }}
                  onBlur={() => window.setTimeout(() => setCitySuggestionsOpen(false), 150)}
                  onKeyDown={handleCityKeyDown}
                  placeholder="Cidade"
                  className="h-12 border-0 bg-white/5 pl-10 shadow-none"
                  role="combobox"
                  aria-label="Filtrar por cidade"
                  aria-autocomplete="list"
                  aria-expanded={citySuggestionsOpen}
                  aria-controls="city-search-suggestions"
                  aria-activedescendant={activeCitySuggestion >= 0 ? `city-search-suggestion-${activeCitySuggestion}` : undefined}
                />
                {citySuggestionsOpen && (
                  <div id="city-search-suggestions" role="listbox" className="absolute left-0 right-0 top-[calc(100%+0.5rem)] z-30 overflow-hidden rounded-xl bg-popover p-1.5 smooth-shadow-ring-md smooth-ring-white/10 shadow-black/40">
                    {citySuggestionsLoading ? (
                      <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground" role="status">
                        <LoaderCircle className="size-4 animate-spin" /> Buscando cidades...
                      </div>
                    ) : citySuggestions.length ? (
                      citySuggestions.map((suggestion, index) => (
                        <button
                          key={`${suggestion.city}-${suggestion.state}`}
                          id={`city-search-suggestion-${index}`}
                          type="button"
                          role="option"
                          aria-selected={activeCitySuggestion === index}
                          onMouseDown={(event) => event.preventDefault()}
                          onMouseEnter={() => setActiveCitySuggestion(index)}
                          onClick={() => selectCitySuggestion(suggestion)}
                          className={`flex w-full items-center justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition ${activeCitySuggestion === index ? "bg-primary/15" : "hover:bg-white/6"}`}
                        >
                          <span className="truncate text-sm font-medium text-white">{suggestion.city}</span>
                          <span className="shrink-0 text-xs text-muted-foreground">{suggestion.state}</span>
                        </button>
                      ))
                    ) : (
                      <p className="px-3 py-3 text-sm text-muted-foreground">Nenhuma cidade encontrada.</p>
                    )}
                  </div>
                )}
              </label>
              <Button type="submit" size="lg" className="h-12 px-6">Encontrar eventos <ArrowRight /></Button>
            </form>

            <div className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs text-white/55">
              <span className="inline-flex items-center gap-2"><ShieldCheck className="size-4 text-cyan-300" /> Reserva protegida</span>
              <span className="inline-flex items-center gap-2"><TicketCheck className="size-4 text-cyan-300" /> Ingresso digital</span>
              <span className="inline-flex items-center gap-2"><CalendarCheck2 className="size-4 text-cyan-300" /> Eventos verificados</span>
            </div>
          </div>
        </div>

        <a href="#eventos" className="absolute bottom-3 left-1/2 z-10 hidden -translate-x-1/2 items-center gap-1.5 text-[11px] font-medium text-white/40 transition hover:text-white/70 [@media(min-height:850px)]:flex">
          Role para ver todos <ChevronDown className="size-3.5" />
        </a>
      </section>

      <section id="eventos" className="content-grid py-16 sm:py-20">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-primary">Explore sua cidade</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">Eventos em movimento</h2>
            <p className="mt-3 text-sm text-muted-foreground">Escolha o que combina com seu momento.</p>
          </div>
          <div className="flex max-w-full gap-2 overflow-x-auto pb-1">
            <Button size="sm" variant={!categoryId ? "default" : "outline"} onClick={() => chooseCategory(undefined)}>Todos</Button>
            {categories.map((category) => (
              <Button key={category.id} size="sm" variant={categoryId === category.id ? "default" : "outline"} onClick={() => chooseCategory(category.id)}>{category.name}</Button>
            ))}
          </div>
        </div>

        <div className="mt-9" aria-busy={loading}>
          <p
            className={loading || error || events.length === 0 ? "sr-only" : "mb-4 text-sm text-muted-foreground"}
            role="status"
            aria-live="polite"
          >
            {loading ? "Carregando eventos." : error ? "" : `${pagination.total} ${pagination.total === 1 ? "evento encontrado" : "eventos encontrados"}`}
          </p>
          {loading ? <StatePanel kind="loading" description="Buscando experiências perto de você." /> : error ? (
            <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void loadEvents(appliedFilters, pagination.page) }} />
          ) : events.length === 0 ? (
            <StatePanel kind="empty" title="Nenhum evento encontrado" description="Tente mudar a cidade, a categoria ou o termo pesquisado." />
          ) : (
            <div>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {events.map((event, index) => <EventCard key={event.id} event={event} priority={index < 3 && pagination.page === 1} />)}
              </div>
              {pagination.totalPages > 1 ? (
                <nav ref={paginationAnchorRef} aria-label="Paginação do catálogo" className="mt-8 flex flex-col gap-3 border-t border-white/8 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-sm tabular-nums text-muted-foreground">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pagination.page <= 1}
                      onClick={() => changePage(pagination.page - 1)}
                      aria-label="Ir para a página anterior do catálogo"
                    >
                      <ChevronLeft aria-hidden="true" /> Anterior
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pagination.page >= pagination.totalPages}
                      onClick={() => changePage(pagination.page + 1)}
                      aria-label="Ir para a próxima página do catálogo"
                    >
                      Próxima <ChevronRight aria-hidden="true" />
                    </Button>
                  </div>
                </nav>
              ) : null}
            </div>
          )}
        </div>
      </section>

      <section className="content-grid pb-20">
        <div className="relative overflow-hidden rounded-3xl border border-primary/18 bg-primary/8 px-6 py-10 sm:px-10 lg:flex lg:items-center lg:justify-between">
          <div className="absolute -right-20 -top-36 size-80 rounded-full bg-primary/18 blur-3xl" />
          <div className="relative max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[.22em] text-cyan-300">Para quem faz acontecer</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em] text-white">Seu evento também pode pulsar aqui.</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">Crie sua página, publique ingressos e acompanhe ocupação e validações em um só lugar.</p>
          </div>
          <Button asChild size="lg" className="relative mt-7 lg:mt-0"><Link href="/produtor/ativar">Conhecer área do produtor <ArrowRight /></Link></Button>
        </div>
      </section>
    </main>
  );
}
