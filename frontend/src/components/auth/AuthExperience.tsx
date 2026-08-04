"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LoaderCircle, ShieldCheck } from "lucide-react";
import { BrandMark } from "@/components/brand/Brand";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";

export function AuthExperience({ mode }: { mode: "sign-in" | "sign-up" }) {
  const searchParams = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const [created, setCreated] = useState(false);
  const redirect = searchParams.get("redirect") || "/";
  const signingUp = mode === "sign-up";

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    if (signingUp) {
      const result = await authClient.signUp.email({ name, email, password, callbackURL: redirect });
      if (result.error) setError(result.error.message ?? "Não foi possível criar sua conta.");
      else setCreated(true);
    } else {
      const result = await authClient.signIn.email({ email, password, callbackURL: redirect });
      if (result.error) setError(result.error.message ?? "E-mail ou senha inválidos.");
      else window.location.assign(redirect);
    }
    setBusy(false);
  }

  if (created) {
    return (
      <AuthShell>
        <Card className="smooth-shadow-ring-lg smooth-ring-white/10 shadow-black/40 bg-card/88">
          <CardContent className="flex flex-col items-center px-7 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300"><CheckCircle2 /></span>
            <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">Confira seu e-mail</h1>
            <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Enviamos o link de verificação para <strong className="text-white">{email}</strong>. Depois disso, sua conta estará pronta para reservar ingressos.</p>
            <Button asChild className="mt-7 w-full"><Link href="/entrar">Ir para o login</Link></Button>
          </CardContent>
        </Card>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <Card className="smooth-shadow-ring-lg smooth-ring-white/10 shadow-black/40 bg-card/88">
        <CardHeader className="px-7 pt-7">
          <div className="mb-4 flex items-center gap-3"><BrandMark /><span className="text-xs font-semibold uppercase tracking-[.2em] text-primary">Pulso</span></div>
          <CardTitle className="text-2xl tracking-[-0.04em]">{signingUp ? "Crie sua conta" : "Que bom ter você de volta"}</CardTitle>
          <CardDescription>{signingUp ? "Entre na cidade em movimento em menos de um minuto." : "Acesse seus ingressos, pedidos e experiências."}</CardDescription>
        </CardHeader>
        <CardContent className="px-7 pb-7">
          <form onSubmit={submit} className="space-y-4">
            {signingUp && <div className="space-y-2"><Label htmlFor="name">Nome completo</Label><Input id="name" autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} minLength={2} required /></div>}
            <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div>
            <div className="space-y-2">
              <div className="flex items-center justify-between"><Label htmlFor="password">Senha</Label>{!signingUp && <Link href="/esqueci-senha" className="text-xs text-primary hover:underline">Esqueci minha senha</Link>}</div>
              <div className="relative">
                <Input id="password" type={showPassword ? "text" : "password"} autoComplete={signingUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required className="pr-10" />
                <Button type="button" variant="ghost" size="icon-sm" className="absolute right-1.5 top-1/2 -translate-y-1/2" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}>{showPassword ? <EyeOff /> : <Eye />}</Button>
              </div>
            </div>
            {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
            <Button type="submit" className="h-11 w-full" disabled={busy}>{busy ? <><LoaderCircle className="animate-spin" /> Aguarde...</> : <>{signingUp ? "Criar minha conta" : "Entrar na Pulso"}<ArrowRight /></>}</Button>
          </form>
          <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>{signingUp ? "Já tem uma conta?" : "Ainda não está na Pulso?"}</span>
            <Link href={signingUp ? "/entrar" : "/criar-conta"} className="font-medium text-primary hover:underline">{signingUp ? "Entrar" : "Criar conta"}</Link>
          </div>
          <p className="mt-6 flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground"><ShieldCheck className="size-3.5 text-cyan-300" /> Sessão protegida por cookie HttpOnly</p>
        </CardContent>
      </Card>
    </AuthShell>
  );
}

function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative isolate grid min-h-[calc(100vh-4rem)] place-items-center overflow-hidden px-4 py-12">
      <div className="brand-grid absolute inset-0 -z-20 opacity-50" />
      <div className="absolute -left-40 top-20 -z-10 size-96 rounded-full bg-primary/12 blur-3xl" />
      <div className="w-full max-w-md">{children}</div>
    </main>
  );
}
