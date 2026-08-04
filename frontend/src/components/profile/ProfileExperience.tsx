"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, CircleAlert, LoaderCircle, ShieldCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api/client";
import { fieldErrors, problemMessage } from "@/lib/api/problem";
import type { Profile } from "@/lib/api/types";
import { authClient } from "@/lib/auth-client";

type ProfileForm = { name: string; phone: string; cpf: string; postalCode: string; street: string; number: string; complement: string; district: string; city: string; state: string };
const empty: ProfileForm = { name: "", phone: "", cpf: "", postalCode: "", street: "", number: "", complement: "", district: "", city: "", state: "" };

export function ProfileExperience() {
  const [profile, setProfile] = useState<Profile>();
  const [form, setForm] = useState<ProfileForm>(empty);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: apiError } = await api.GET("/api/v1/profile");
    if (apiError) setError(problemMessage(apiError, "Entre para acessar seu perfil."));
    if (data) {
      setProfile(data);
      setForm({
        name: data.name,
        phone: data.profile?.phone ?? "",
        cpf: "",
        postalCode: data.profile?.postalCode ?? "",
        street: data.profile?.street ?? "",
        number: data.profile?.number ?? "",
        complement: data.profile?.complement ?? "",
        district: data.profile?.district ?? "",
        city: data.profile?.city ?? "",
        state: data.profile?.state ?? "",
      });
    }
    setLoading(false);
  }, []);

  useEffect(() => { void Promise.resolve().then(load); }, [load]);

  function update(field: keyof ProfileForm, value: string) { setForm((current) => ({ ...current, [field]: value })); }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(undefined);
    const { data, error: apiError } = await api.PATCH("/api/v1/profile", { body: { ...form, complement: form.complement || undefined, state: form.state.toUpperCase() } });
    if (apiError) {
      const validation = fieldErrors(apiError).map((item) => item.message).filter(Boolean).join(" · ");
      setError(validation || problemMessage(apiError));
    } else if (data) {
      setProfile(data);
      setForm((current) => ({ ...current, cpf: "" }));
      toast.success("Perfil atualizado.");
    }
    setBusy(false);
  }

  async function resendVerification() {
    if (!profile) return;
    const result = await authClient.sendVerificationEmail({ email: profile.email, callbackURL: `${window.location.origin}/conta/verificada` });
    if (result.error) toast.error(result.error.message ?? "Não foi possível reenviar."); else toast.success("E-mail reenviado.");
  }

  if (loading) return <main className="content-grid py-12"><StatePanel kind="loading" /></main>;
  if (!profile) return <main className="content-grid py-12"><StatePanel kind="error" title="Sessão necessária" description={error} action={{ label: "Entrar", onClick: () => window.location.assign("/entrar?redirect=/perfil") }} /></main>;

  return (
    <main className="content-grid py-10 sm:py-14">
      <PageHeader eyebrow="Minha conta" title="Seu perfil na Pulso" description="Mantenha seus dados atualizados para reservar ingressos e ativar a área do produtor." />
      <div className="mt-8 grid gap-6 lg:grid-cols-[300px_1fr]">
        <div className="space-y-4">
          <Card><CardContent className="p-6"><span className="grid size-12 place-items-center rounded-2xl bg-primary/10 text-primary"><UserRound /></span><h2 className="mt-4 font-semibold text-white">{profile.name}</h2><p className="mt-1 truncate text-sm text-muted-foreground">{profile.email}</p><div className="mt-4 flex flex-wrap gap-2">{profile.roles.map((role) => <Badge key={role} variant="secondary">{role}</Badge>)}</div></CardContent></Card>
          <Card><CardHeader><CardTitle className="text-base">Prontidão da conta</CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><StatusLine done={profile.emailVerified} label="E-mail verificado" /><StatusLine done={profile.profileComplete} label="Perfil completo" /><StatusLine done={profile.roles.includes("organizer")} label="Área do produtor" /></CardContent></Card>
        </div>

        <Card>
          <CardHeader><CardTitle>Dados pessoais e endereço</CardTitle></CardHeader>
          <CardContent>
            {!profile.emailVerified && <Alert className="mb-6 border-amber-400/20 bg-amber-400/5"><CircleAlert className="text-amber-300" /><AlertTitle>Verifique seu e-mail</AlertTitle><AlertDescription className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><span>Você precisa confirmar o endereço antes de reservar.</span><Button type="button" variant="outline" size="sm" onClick={resendVerification}>Reenviar link</Button></AlertDescription></Alert>}
            <form onSubmit={submit} className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nome completo" id="name" value={form.name} onChange={(value) => update("name", value)} autoComplete="name" />
                <Field label="Telefone" id="phone" value={form.phone} onChange={(value) => update("phone", value.replace(/\D/g, ""))} placeholder="11999999999" autoComplete="tel" />
                <div className="space-y-2 sm:col-span-2"><Label htmlFor="cpf">CPF</Label><Input id="cpf" value={form.cpf} onChange={(event) => update("cpf", event.target.value.replace(/\D/g, "").slice(0, 11))} placeholder={profile.profile?.cpf ?? "Somente números"} inputMode="numeric" required /><p className="text-[11px] text-muted-foreground">Por segurança, o CPF é exibido apenas mascarado e deve ser informado novamente ao salvar.</p></div>
              </div>
              <div className="border-t border-white/8 pt-6"><h3 className="mb-4 text-sm font-medium text-white">Endereço</h3><div className="grid gap-4 sm:grid-cols-6">
                <div className="sm:col-span-2"><Field label="CEP" id="postalCode" value={form.postalCode} onChange={(value) => update("postalCode", value.replace(/\D/g, "").slice(0, 8))} autoComplete="postal-code" /></div>
                <div className="sm:col-span-4"><Field label="Rua" id="street" value={form.street} onChange={(value) => update("street", value)} autoComplete="address-line1" /></div>
                <div className="sm:col-span-2"><Field label="Número" id="number" value={form.number} onChange={(value) => update("number", value)} /></div>
                <div className="sm:col-span-4"><Field label="Complemento" id="complement" value={form.complement} onChange={(value) => update("complement", value)} required={false} /></div>
                <div className="sm:col-span-2"><Field label="Bairro" id="district" value={form.district} onChange={(value) => update("district", value)} /></div>
                <div className="sm:col-span-3"><Field label="Cidade" id="city" value={form.city} onChange={(value) => update("city", value)} autoComplete="address-level2" /></div>
                <div className="sm:col-span-1"><Field label="UF" id="state" value={form.state} onChange={(value) => update("state", value.toUpperCase().slice(0, 2))} autoComplete="address-level1" /></div>
              </div></div>
              {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}
              <div className="flex justify-end"><Button type="submit" disabled={busy}>{busy && <LoaderCircle className="animate-spin" />}{busy ? "Salvando..." : "Salvar perfil"}</Button></div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}

function Field({ label, id, value, onChange, required = true, ...props }: { label: string; id: string; value: string; onChange: (value: string) => void; required?: boolean; placeholder?: string; autoComplete?: string }) {
  return <div className="space-y-2"><Label htmlFor={id}>{label}</Label><Input id={id} value={value} onChange={(event) => onChange(event.target.value)} required={required} {...props} /></div>;
}

function StatusLine({ done, label }: { done: boolean; label: string }) {
  return <div className="flex items-center gap-2"><span className={done ? "text-cyan-300" : "text-muted-foreground"}>{done ? <CheckCircle2 className="size-4" /> : <ShieldCheck className="size-4" />}</span><span className={done ? "text-white" : "text-muted-foreground"}>{label}</span></div>;
}
