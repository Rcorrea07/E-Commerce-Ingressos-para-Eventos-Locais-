"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
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
import type { AdminOrders, AdminTickets, AdminUsers } from "@/lib/api/types";
import { formatDateTime, formatMoney } from "@/lib/format";

type RecordKind = "orders" | "tickets" | "users";
type RecordsData = AdminOrders | AdminTickets | AdminUsers;

const copy = {
  orders: { eyebrow: "Transações", title: "Pedidos", description: "Acompanhe pedidos confirmados e cancelamentos em toda a plataforma." },
  tickets: { eyebrow: "Emissão", title: "Ingressos", description: "Consulte o ciclo de vida de cada ingresso individual emitido." },
  users: { eyebrow: "Identidade", title: "Usuários", description: "Encontre perfis, papéis acumulados e status de acesso." },
};

export function AdminRecords({ kind }: { kind: RecordKind }) {
  const [data, setData] = useState<RecordsData>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true); setError(undefined);
    if (kind === "orders") {
      const result = await api.GET("/api/v1/admin/orders", { params: { query: { page, pageSize: 20, status: filter === "ALL" ? undefined : filter as "CONFIRMED" | "CANCELLED_BY_CUSTOMER" | "CANCELLED_BY_EVENT" } } });
      if (result.error) setError(problemMessage(result.error)); setData(result.data);
    } else if (kind === "tickets") {
      const result = await api.GET("/api/v1/admin/tickets", { params: { query: { page, pageSize: 20, status: filter === "ALL" ? undefined : filter as "ISSUED" | "USED" | "CANCELLED" } } });
      if (result.error) setError(problemMessage(result.error)); setData(result.data);
    } else {
      const result = await api.GET("/api/v1/admin/users", { params: { query: { page, pageSize: 20, search: search || undefined, role: filter === "ALL" ? undefined : filter as "customer" | "organizer" | "gate_staff" | "admin" } } });
      if (result.error) setError(problemMessage(result.error)); setData(result.data);
    }
    setLoading(false);
  }, [filter, kind, page, search]);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  function submitSearch(event: FormEvent) { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }
  const options = kind === "orders" ? [["CONFIRMED", "Confirmado"], ["CANCELLED_BY_CUSTOMER", "Cancelado pelo cliente"], ["CANCELLED_BY_EVENT", "Cancelado pelo evento"]] : kind === "tickets" ? [["ISSUED", "Emitido"], ["USED", "Utilizado"], ["CANCELLED", "Cancelado"]] : [["customer", "Cliente"], ["organizer", "Produtor"], ["gate_staff", "Portaria"], ["admin", "Admin"]];

  return <div>
    <PageHeader {...copy[kind]} />
    <Card className="mt-6"><CardContent className="p-4"><form className="flex flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
      {kind === "users" && <div className="relative flex-1"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><Input className="pl-9" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Buscar por nome ou e-mail" /></div>}
      <Select value={filter} onValueChange={(value) => { setFilter(value); setPage(1); }}><SelectTrigger className={kind === "users" ? "w-full sm:w-48" : "w-full sm:ml-auto sm:w-56"}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="ALL">Todos os status</SelectItem>{options.map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent></Select>
      {kind === "users" && <Button type="submit">Buscar</Button>}
    </form></CardContent></Card>
    <div className="mt-5">{loading ? <StatePanel kind="loading" /> : error || !data ? <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void load() }} /> : data.data.length === 0 ? <StatePanel kind="empty" description="Nenhum registro corresponde aos filtros atuais." /> : <RecordsTable kind={kind} data={data} page={page} onPage={setPage} />}</div>
  </div>;
}

function RecordsTable({ kind, data, page, onPage }: { kind: RecordKind; data: RecordsData; page: number; onPage: (page: number) => void }) {
  return <Card className="overflow-hidden"><div className="overflow-x-auto">
    {kind === "orders" && <OrdersTable data={data as AdminOrders} />}
    {kind === "tickets" && <TicketsTable data={data as AdminTickets} />}
    {kind === "users" && <UsersTable data={data as AdminUsers} />}
  </div><div className="flex items-center justify-between border-t border-white/8 px-4 py-3"><span className="text-xs text-muted-foreground">{data.pagination.total} registro(s)</span><div className="flex gap-2"><Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>Anterior</Button><Button variant="outline" size="sm" disabled={page >= data.pagination.totalPages} onClick={() => onPage(page + 1)}>Próxima</Button></div></div></Card>;
}

function OrdersTable({ data }: { data: AdminOrders }) { return <Table><TableHeader><TableRow><TableHead>Pedido</TableHead><TableHead>Cliente</TableHead><TableHead>Evento</TableHead><TableHead>Itens</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Total</TableHead></TableRow></TableHeader><TableBody>{data.data.map((order) => <TableRow key={order.id}><TableCell><span className="font-mono text-xs text-white">{order.publicId}</span><span className="block text-[11px] text-muted-foreground">{formatDateTime(order.createdAt)}</span></TableCell><TableCell>{order.customerName}<span className="block text-xs text-muted-foreground">{order.customerEmail}</span></TableCell><TableCell>{order.eventTitle}<span className="block text-xs text-muted-foreground">{formatDateTime(order.eventStartsAt)}</span></TableCell><TableCell>{order.items.reduce((total, item) => total + item.quantity, 0)}</TableCell><TableCell><Badge variant={order.status === "CONFIRMED" ? "default" : "destructive"}>{order.status}</Badge></TableCell><TableCell className="text-right font-medium">{formatMoney(order.totalCents)}</TableCell></TableRow>)}</TableBody></Table>; }
function TicketsTable({ data }: { data: AdminTickets }) { return <Table><TableHeader><TableRow><TableHead>Ingresso</TableHead><TableHead>Evento</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Validação</TableHead></TableRow></TableHeader><TableBody>{data.data.map((ticket) => <TableRow key={ticket.id}><TableCell><span className="font-mono text-xs text-white">{ticket.publicId}</span><span className="block text-[11px] text-muted-foreground">Pedido {ticket.orderItem.order.publicId}</span></TableCell><TableCell>{ticket.event.title}<span className="block text-xs text-muted-foreground">{formatDateTime(ticket.event.startsAt)}</span></TableCell><TableCell>{ticket.orderItem.ticketTypeName} #{ticket.unitSequence}</TableCell><TableCell><Badge variant={ticket.status === "ISSUED" ? "default" : ticket.status === "USED" ? "secondary" : "destructive"}>{ticket.status}</Badge></TableCell><TableCell>{ticket.validatedAt ? formatDateTime(ticket.validatedAt) : "—"}</TableCell></TableRow>)}</TableBody></Table>; }
function UsersTable({ data }: { data: AdminUsers }) { return <Table><TableHeader><TableRow><TableHead>Usuário</TableHead><TableHead>Papéis</TableHead><TableHead>E-mail</TableHead><TableHead>Acesso</TableHead><TableHead>Cadastro</TableHead></TableRow></TableHeader><TableBody>{data.data.map((user) => <TableRow key={user.id}><TableCell><strong className="font-medium text-white">{user.name}</strong><span className="block text-xs text-muted-foreground">{user.email}</span></TableCell><TableCell><div className="flex flex-wrap gap-1">{user.role.split(",").map((role) => <Badge variant="secondary" key={role}>{role.trim()}</Badge>)}</div></TableCell><TableCell><Badge variant={user.emailVerified ? "default" : "outline"}>{user.emailVerified ? "Verificado" : "Pendente"}</Badge></TableCell><TableCell><Badge variant={user.banned ? "destructive" : "secondary"}>{user.banned ? "Bloqueado" : "Ativo"}</Badge></TableCell><TableCell>{formatDateTime(user.createdAt)}</TableCell></TableRow>)}</TableBody></Table>; }
