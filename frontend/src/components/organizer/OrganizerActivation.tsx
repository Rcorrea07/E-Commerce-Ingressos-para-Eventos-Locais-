"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, AudioWaveform, CheckCircle2, CircleAlert, MailCheck, UserCheck } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatePanel } from "@/components/states/StatePanel";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";
import type { Profile } from "@/lib/api/types";

export function OrganizerActivation() {
  const router = useRouter(); const [profile, setProfile] = useState<Profile>(); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState<string>();
  const load = useCallback(async () => { const { data, error: apiError } = await api.GET("/api/v1/profile"); if (apiError) setError(problemMessage(apiError)); setProfile(data); setLoading(false); }, []);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function activate() { setBusy(true); const { data, error: apiError } = await api.POST("/api/v1/organizer/activate"); if (apiError) toast.error(problemMessage(apiError)); else if (data?.activated) { toast.success("Área do produtor ativada."); router.replace("/produtor"); router.refresh(); } setBusy(false); }
  if (loading) return <main className="content-grid py-12"><StatePanel kind="loading" /></main>;
  if (!profile) return <main className="content-grid py-12"><StatePanel kind="error" description={error} action={{ label: "Entrar", onClick: () => router.push("/entrar?redirect=/produtor/ativar") }} /></main>;
  if (profile.roles.includes("organizer")) { router.replace("/produtor"); return null; }
  const ready = profile.emailVerified && profile.profileComplete;
  return <main className="content-grid py-10 sm:py-14"><div className="mx-auto max-w-4xl"><PageHeader eyebrow="Faça acontecer" title="Ative sua área do produtor" description="Publique experiências, acompanhe vendas simuladas e organize a portaria com a mesma conta." /><div className="mt-8 grid gap-5 sm:grid-cols-2"><RequirementCard done={profile.emailVerified} icon={MailCheck} title="E-mail verificado" description="Confirme que a conta realmente pertence a você." action={!profile.emailVerified ? { href: "/verificar-email", label: "Verificar agora" } : undefined} /><RequirementCard done={profile.profileComplete} icon={UserCheck} title="Perfil completo" description="Precisamos dos dados básicos do responsável pelo evento." action={!profile.profileComplete ? { href: "/perfil?complete=1", label: "Completar perfil" } : undefined} /></div><Card className="mt-6 smooth-ring-primary/18 shadow-primary/10 bg-primary/6"><CardContent className="flex flex-col items-start gap-5 p-6 sm:flex-row sm:items-center"><span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><AudioWaveform /></span><div className="flex-1"><h2 className="font-semibold text-white">Tudo pronto para começar?</h2><p className="mt-1 text-sm text-muted-foreground">A ativação é imediata e cumulativa: você continua comprando ingressos normalmente.</p></div><Button onClick={activate} disabled={!ready || busy}>{busy ? "Ativando..." : "Ativar área do produtor"}<ArrowRight /></Button></CardContent></Card>{!ready && <Alert className="mt-5"><CircleAlert /><AlertDescription>Conclua os dois requisitos acima para liberar a ativação.</AlertDescription></Alert>}</div></main>;
}

function RequirementCard({ done, icon: Icon, title, description, action }: { done: boolean; icon: typeof MailCheck; title: string; description: string; action?: { href: string; label: string } }) { return <Card><CardContent className="p-6"><div className="flex items-start gap-4"><span className={done ? "grid size-11 place-items-center rounded-xl bg-cyan-300/10 text-cyan-300" : "grid size-11 place-items-center rounded-xl bg-white/5 text-muted-foreground"}>{done ? <CheckCircle2 /> : <Icon />}</span><div><h2 className="font-medium text-white">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>{action && <Button asChild variant="link" className="mt-2 h-auto p-0"><Link href={action.href}>{action.label}<ArrowRight /></Link></Button>}</div></div></CardContent></Card>; }
