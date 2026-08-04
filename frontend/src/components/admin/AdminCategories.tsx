"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Category } from "@/lib/api/types";
import { formatDateTime } from "@/lib/format";

function slugify(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""); }

export function AdminCategories() {
  const [categories, setCategories] = useState<Category[]>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [editing, setEditing] = useState<Category | null>();
  const [createOpen, setCreateOpen] = useState(false);

  const load = useCallback(async () => { setLoading(true); const result = await api.GET("/api/v1/admin/categories"); if (result.error) setError(problemMessage(result.error)); setCategories(result.data); setLoading(false); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  return <div><PageHeader eyebrow="Descoberta" title="Categorias" description="Organize a vitrine pública sem apagar o histórico dos eventos." actions={<Button onClick={() => setCreateOpen(true)}><Plus /> Nova categoria</Button>} /><div className="mt-6">{loading ? <StatePanel kind="loading" /> : error || !categories ? <StatePanel kind="error" description={error} action={{ label: "Tentar novamente", onClick: () => void load() }} /> : <Card className="overflow-hidden"><div className="overflow-x-auto"><Table><TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Slug</TableHead><TableHead>Status</TableHead><TableHead>Atualizada</TableHead><TableHead className="text-right">Ação</TableHead></TableRow></TableHeader><TableBody>{categories.map((category) => <TableRow key={category.id}><TableCell className="font-medium text-white">{category.name}</TableCell><TableCell className="font-mono text-xs">{category.slug}</TableCell><TableCell><Badge variant={category.active ? "default" : "secondary"}>{category.active ? "Ativa" : "Inativa"}</Badge></TableCell><TableCell>{formatDateTime(category.updatedAt)}</TableCell><TableCell className="text-right"><Button size="sm" variant="ghost" onClick={() => setEditing(category)}><Pencil /> Editar</Button></TableCell></TableRow>)}</TableBody></Table></div></Card>}</div>{createOpen && <CategoryDialog key="new" open onOpenChange={setCreateOpen} onSaved={load} />}{editing && <CategoryDialog key={editing.id} category={editing} open onOpenChange={(open) => !open && setEditing(null)} onSaved={load} />}</div>;
}

function CategoryDialog({ category, open, onOpenChange, onSaved }: { category?: Category; open: boolean; onOpenChange: (open: boolean) => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(category?.name ?? ""); const [slug, setSlug] = useState(category?.slug ?? ""); const [busy, setBusy] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true);
    const result = category ? await api.PATCH("/api/v1/categories/{id}", { params: { path: { id: category.id } }, body: { name } }) : await api.POST("/api/v1/categories", { body: { name, slug: slug || slugify(name) } });
    if (result.error) toast.error(problemMessage(result.error)); else { toast.success(category ? "Categoria atualizada." : "Categoria criada."); onOpenChange(false); await onSaved(); }
    setBusy(false);
  }
  async function toggleActive() { if (!category) return; setBusy(true); const result = await api.PATCH("/api/v1/categories/{id}", { params: { path: { id: category.id } }, body: { active: !category.active } }); if (result.error) toast.error(problemMessage(result.error)); else { toast.success(category.active ? "Categoria desativada." : "Categoria reativada."); onOpenChange(false); await onSaved(); } setBusy(false); }
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><form onSubmit={submit}><DialogHeader><DialogTitle>{category ? "Editar categoria" : "Nova categoria"}</DialogTitle><DialogDescription>{category ? "O slug permanece estável para não quebrar links." : "Ela ficará disponível na descoberta de eventos."}</DialogDescription></DialogHeader><div className="mt-5 space-y-4"><div className="space-y-2"><Label htmlFor={`category-name-${category?.id ?? "new"}`}>Nome</Label><Input id={`category-name-${category?.id ?? "new"}`} value={name} onChange={(event) => { setName(event.target.value); if (!category) setSlug(slugify(event.target.value)); }} required minLength={2} /></div>{!category && <div className="space-y-2"><Label htmlFor="category-slug">Slug</Label><Input id="category-slug" value={slug} onChange={(event) => setSlug(slugify(event.target.value))} required /></div>}</div><DialogFooter className="mt-5">{category && <Button type="button" variant="destructive" className="sm:mr-auto" disabled={busy} onClick={() => void toggleActive()}>{category.active ? "Desativar" : "Reativar"}</Button>}<Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button><Button type="submit" disabled={busy || !name.trim()}>{busy ? "Salvando..." : "Salvar"}</Button></DialogFooter></form></DialogContent></Dialog>;
}
