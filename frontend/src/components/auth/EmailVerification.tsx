"use client";

import Link from "next/link";
import { useState } from "react";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { authClient } from "@/lib/auth-client";

export function EmailVerification({ verified = false }: { verified?: boolean }) {
  const { data: session } = authClient.useSession();
  const [busy, setBusy] = useState(false);
  async function resend() {
    const email = session?.user.email;
    if (!email) { window.location.assign("/entrar"); return; }
    setBusy(true);
    const result = await authClient.sendVerificationEmail({ email, callbackURL: `${window.location.origin}/conta/verificada` });
    if (result.error) toast.error(result.error.message ?? "Não foi possível reenviar o e-mail.");
    else toast.success("E-mail de verificação reenviado.");
    setBusy(false);
  }
  return (
    <main className="content-grid grid min-h-[70vh] place-items-center py-12">
      <Card className="surface-glow w-full max-w-lg border-white/10 bg-card/88">
        <CardContent className="flex flex-col items-center px-8 py-12 text-center">
          <span className="grid size-14 place-items-center rounded-2xl bg-cyan-300/10 text-cyan-300"><MailCheck /></span>
          <h1 className="mt-5 text-2xl font-semibold tracking-[-0.04em] text-white">{verified ? "E-mail confirmado" : "Confirme seu e-mail"}</h1>
          <p className="mt-3 max-w-md text-sm leading-6 text-muted-foreground">{verified ? "Sua conta está pronta. Complete o perfil quando quiser reservar ingressos ou produzir eventos." : "A verificação protege sua conta e é obrigatória antes de iniciar uma reserva."}</p>
          <div className="mt-7 flex w-full flex-col gap-2 sm:flex-row">
            {verified ? <Button asChild className="flex-1"><Link href="/">Explorar eventos</Link></Button> : <Button onClick={resend} disabled={busy} className="flex-1">{busy ? "Reenviando..." : "Reenviar e-mail"}</Button>}
            <Button asChild variant="outline" className="flex-1"><Link href="/perfil">Ir para o perfil</Link></Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
