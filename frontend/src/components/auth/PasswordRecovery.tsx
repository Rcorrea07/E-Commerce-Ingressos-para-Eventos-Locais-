"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, KeyRound, LoaderCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authClient } from "@/lib/auth-client";
import { authErrorMessage } from "@/lib/auth-errors";

export function PasswordRecovery({ mode }: { mode: "request" | "reset" }) {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string>();

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const result = mode === "request"
      ? await authClient.requestPasswordReset({ email, redirectTo: `${window.location.origin}/redefinir-senha` })
      : await authClient.resetPassword({ newPassword: password, token });
    if (result.error) setError(authErrorMessage(result.error, "Não foi possível concluir a solicitação. Tente novamente."));
    else setDone(true);
    setBusy(false);
  }

  if (mode === "reset" && !token) {
    return (
      <main className="content-grid grid min-h-[70vh] place-items-center py-12">
        <Card className="smooth-shadow-ring-lg smooth-ring-white/10 shadow-black/40 w-full max-w-md bg-card/88">
          <CardHeader>
            <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound /></span>
            <CardTitle>Link inválido ou expirado</CardTitle>
            <CardDescription>Os links de redefinição valem por pouco tempo. Solicite um novo para continuar.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full"><Link href="/esqueci-senha">Solicitar novo link</Link></Button>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="content-grid grid min-h-[70vh] place-items-center py-12">
      <Card className="smooth-shadow-ring-lg smooth-ring-white/10 shadow-black/40 w-full max-w-md bg-card/88">
        <CardHeader>
          <span className="mb-3 grid size-11 place-items-center rounded-xl bg-primary/10 text-primary"><KeyRound /></span>
          <CardTitle>{mode === "request" ? "Recupere sua senha" : "Crie uma nova senha"}</CardTitle>
          <CardDescription>{mode === "request" ? "Enviaremos um link seguro para o seu e-mail." : "Use ao menos 8 caracteres para proteger sua conta."}</CardDescription>
        </CardHeader>
        <CardContent>
          {done ? (
            <div className="text-center"><CheckCircle2 className="mx-auto size-10 text-cyan-300" /><p className="mt-4 text-sm text-muted-foreground">{mode === "request" ? "Se o e-mail estiver cadastrado, o link chegará em instantes." : "Senha atualizada com sucesso."}</p><Button asChild className="mt-6 w-full"><Link href="/entrar">Entrar</Link></Button></div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              {mode === "request" ? <div className="space-y-2"><Label htmlFor="email">E-mail</Label><Input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></div> : <div className="space-y-2"><Label htmlFor="new-password">Nova senha</Label><Input id="new-password" type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required /></div>}
              {error && <Alert variant="destructive" role="alert"><AlertDescription>{error}</AlertDescription></Alert>}
              <Button type="submit" className="w-full" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{mode === "request" ? "Enviar link" : "Atualizar senha"}</Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}
