"use client";

import Link from "next/link";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { ArrowRight, Search } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { AdminEvents } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

type EventStatus = "DRAFT" | "PENDING_REVIEW" | "REJECTED" | "PUBLISHED" | "CANCELLED";

const statusLabels: Record<EventStatus, string> = {
  DRAFT: "Rascunho",
  PENDING_REVIEW: "Em análise",
  REJECTED: "Rejeitado",
  PUBLISHED: "Publicado",
  CANCELLED: "Cancelado",
};

export function AdminEvents() {
  const [data, setData] = useState<AdminEvents>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<EventStatus | "ALL">("PENDING_REVIEW");

  const load = useCallback(async () => {
    setLoading(true);
    setError(undefined);
    const result = await api.GET("/api/v1/admin/events", {
      params: { query: { page, pageSize: 20, search: search || undefined, status: status === "ALL" ? undefined : status } },
    });
    if (result.error) setError(problemMessage(result.error, "Não foi possível carregar os eventos."));
    setData(result.data);
    setLoading(false);
  }, [page, search, status]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  function submitSearch(event: FormEvent) {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  return (
    <div>
      <PageHeader eyebrow="Curadoria" title="Eventos da plataforma" description="Revise submissões, acompanhe o catálogo e aja com contexto." />
      <Card className="mt-6">
        <CardContent className="p-4">
          <form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} className="pl-9" placeholder="Buscar evento ou produtor" />
            </div>
            <Select value={status} onValueChange={(value) => { setStatus(value as EventStatus | "ALL"); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos os status</SelectItem>
                {Object.entries(statusLabels).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}
              </SelectContent>
            </Select>
            <Button type="submit">Buscar</Button>
          </form>
        </CardContent>
      </Card>

      <div className="mt-5">
        {loading ? <StatePanel kind="loading" description="Consultando o catálogo." /> : error || !data ? <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void load() }} /> : data.data.length === 0 ? <StatePanel kind="empty" title="Nenhum evento encontrado" description="Ajuste os filtros para ampliar a busca." /> : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader><TableRow><TableHead>Evento</TableHead><TableHead>Produtor</TableHead><TableHead>Data</TableHead><TableHead>Status</TableHead><TableHead>Volume</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader>
                <TableBody>{data.data.map((event) => (
                  <TableRow key={event.id}>
                    <TableCell><strong className="block max-w-64 truncate font-medium text-white">{event.title}</strong><span className="text-xs text-muted-foreground">{event.city}, {event.state}</span></TableCell>
                    <TableCell><span className="block">{event.organizer.name}</span><span className="text-xs text-muted-foreground">{event.organizer.email}</span></TableCell>
                    <TableCell className="whitespace-nowrap">{formatDateTime(event.startsAt)}</TableCell>
                    <TableCell><Badge variant={event.status === "PENDING_REVIEW" ? "default" : event.status === "REJECTED" || event.status === "CANCELLED" ? "destructive" : "secondary"}>{statusLabels[event.status]}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{event._count.ticketTypes} tipos · {event._count.orders} pedidos</TableCell>
                    <TableCell className="text-right"><Button asChild size="sm" variant="ghost"><Link href={`/admin/eventos/${event.id}`}>Revisar <ArrowRight /></Link></Button></TableCell>
                  </TableRow>
                ))}</TableBody>
              </Table>
            </div>
            <Pagination page={data.pagination.page} totalPages={data.pagination.totalPages} total={data.pagination.total} onChange={setPage} />
          </Card>
        )}
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, total, onChange }: { page: number; totalPages: number; total: number; onChange: (page: number) => void }) {
  return <div className="flex items-center justify-between border-t border-white/8 px-4 py-3"><span className="text-xs text-muted-foreground">{total} resultado(s)</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onChange(page - 1)}>Anterior</Button><Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>Próxima</Button></div></div>;
}
