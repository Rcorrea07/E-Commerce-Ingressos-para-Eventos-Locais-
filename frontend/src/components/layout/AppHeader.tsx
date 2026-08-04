"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AudioWaveform, CalendarDays, LogOut, Menu, ScanLine, ShieldCheck, Ticket, UserRound } from "lucide-react";
import { Brand } from "@/components/brand/Brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { authClient } from "@/lib/auth-client";
import { rolesFromSession } from "@/lib/api/types";
import { cn } from "@/lib/utils";

type SessionUser = { name?: string | null; email?: string | null; role?: string | null };

export function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const user = session?.user as SessionUser | undefined;
  const roles = rolesFromSession(user?.role);

  const links = [
    { href: "/#eventos", label: "Eventos", show: true },
    { href: "/ingressos", label: "Meus ingressos", show: Boolean(user) },
    { href: "/produtor", label: "Produtor", show: roles.includes("organizer") || roles.includes("admin") },
    { href: "/portaria", label: "Portaria", show: roles.includes("gate_staff") || roles.includes("admin") },
    { href: "/admin", label: "Admin", show: roles.includes("admin") },
  ].filter((item) => item.show);

  async function signOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  const navigation = (
    <nav className="flex flex-col gap-1 lg:flex-row lg:items-center" aria-label="Navegação principal">
      {links.map((link) => {
        const active = link.href !== "/#eventos" && pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex min-h-10 items-center rounded-lg px-3 py-2 text-sm text-muted-foreground transition-[background-color,color] motion-reduce:transition-none hover:bg-white/5 hover:text-white",
              active && "bg-white/6 text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <header className="sticky top-0 z-50 border-b border-white/8 bg-background/82 backdrop-blur-xl">
      <div className="content-grid flex h-16 items-center justify-between gap-4">
        <Brand />

        <div className="hidden lg:block">{navigation}</div>

        <div className="flex items-center gap-2">
          {!isPending && !user && (
            <>
              <Button variant="ghost" asChild className="hidden sm:inline-flex">
                <Link href="/entrar">Entrar</Link>
              </Button>
              <Button asChild className="shadow-[0_0_30px_rgba(167,139,250,.16)]">
                <Link href="/criar-conta">Criar conta</Link>
              </Button>
            </>
          )}

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2">
                  <Avatar className="size-7">
                    <AvatarFallback className="bg-primary/15 text-xs text-primary">
                      {(user.name ?? user.email ?? "P").slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden max-w-36 truncate text-sm sm:inline">{user.name ?? "Minha conta"}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60">
                <DropdownMenuLabel>
                  <span className="block truncate">{user.name}</span>
                  <span className="block truncate text-xs font-normal text-muted-foreground">{user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild><Link href="/perfil"><UserRound /> Perfil</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/pedidos"><CalendarDays /> Pedidos</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href="/ingressos"><Ticket /> Ingressos</Link></DropdownMenuItem>
                {!roles.includes("organizer") && <DropdownMenuItem asChild><Link href="/produtor/ativar"><AudioWaveform /> Quero produzir</Link></DropdownMenuItem>}
                {(roles.includes("gate_staff") || roles.includes("admin")) && <DropdownMenuItem asChild><Link href="/portaria"><ScanLine /> Portaria</Link></DropdownMenuItem>}
                {roles.includes("admin") && <DropdownMenuItem asChild><Link href="/admin"><ShieldCheck /> Administração</Link></DropdownMenuItem>}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive"><LogOut /> Sair</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Abrir menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-6">
              <SheetTitle className="sr-only">Menu principal</SheetTitle>
              <Brand className="mb-8" />
              {navigation}
              {!isPending && !user && (
                <div className="mt-8 flex flex-col gap-2 border-t border-white/8 pt-6">
                  <SheetClose asChild>
                    <Button variant="outline" asChild>
                      <Link href="/entrar">Entrar</Link>
                    </Button>
                  </SheetClose>
                  <SheetClose asChild>
                    <Button asChild>
                      <Link href="/criar-conta">Criar conta</Link>
                    </Button>
                  </SheetClose>
                </div>
              )}
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
