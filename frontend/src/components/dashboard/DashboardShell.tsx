"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import { BarChart3, CalendarDays, ClipboardCheck, FolderKanban, ScanLine, Settings2, ShieldCheck, Ticket, UsersRound } from "lucide-react";
import { BrandMark } from "@/components/brand/Brand";
import { cn } from "@/lib/utils";

const navigation = {
  organizer: [
    { href: "/produtor", label: "Visão geral", icon: BarChart3 },
    { href: "/produtor/eventos", label: "Meus eventos", icon: CalendarDays },
  ],
  gate: [
    { href: "/portaria", label: "Validar ingresso", icon: ScanLine },
  ],
  admin: [
    { href: "/admin", label: "Visão geral", icon: BarChart3 },
    { href: "/admin/eventos", label: "Eventos", icon: ClipboardCheck },
    { href: "/admin/pedidos", label: "Pedidos", icon: FolderKanban },
    { href: "/admin/ingressos", label: "Ingressos", icon: Ticket },
    { href: "/admin/usuarios", label: "Usuários", icon: UsersRound },
    { href: "/admin/categorias", label: "Categorias", icon: Settings2 },
  ],
};

export function DashboardShell({ area, children }: { area: keyof typeof navigation; children: React.ReactNode }) {
  const pathname = usePathname();
  const names = { organizer: "Área do produtor", gate: "Portaria", admin: "Administração" };
  return (
    <main className="content-grid py-8 sm:py-10">
      <div className="grid gap-6 lg:grid-cols-[230px_1fr]">
        <aside className="h-fit min-w-0 max-w-full overflow-hidden rounded-2xl border border-white/8 bg-card/55 p-3 lg:sticky lg:top-24">
          <div className="flex items-center gap-3 px-3 py-3"><BrandMark className="size-8 rounded-lg" /><div><p className="text-xs text-muted-foreground">Pulso</p><h2 className="text-sm font-medium text-white">{names[area]}</h2></div></div>
          <nav className="mt-3 flex gap-2 overflow-x-auto lg:flex-col" aria-label={names[area]}>
            {navigation[area].map((item) => <DashboardLink key={item.href} {...item} active={pathname === item.href || (item.href !== `/${area === "organizer" ? "produtor" : area === "gate" ? "portaria" : "admin"}` && pathname.startsWith(item.href))} />)}
          </nav>
          {area === "admin" && <div className="mt-4 hidden items-center gap-2 rounded-xl border border-primary/12 bg-primary/5 p-3 text-xs text-muted-foreground lg:flex"><ShieldCheck className="size-4 text-primary" /> Acesso global auditado</div>}
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </main>
  );
}

function DashboardLink({ href, label, icon: Icon, active }: { href: string; label: string; icon: LucideIcon; active: boolean }) {
  return <Link href={href} className={cn("flex shrink-0 items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition", active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-white")}><Icon className="size-4" />{label}</Link>;
}
