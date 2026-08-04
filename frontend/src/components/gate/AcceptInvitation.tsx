"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, LoaderCircle, UserCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api/client";
import { problemMessage } from "@/lib/api/problem";

export function AcceptInvitation() {
  const token = useSearchParams().get("token"); const [state, setState] = useState<"loading" | "success" | "error">(token ? "loading" : "error"); const [message, setMessage] = useState(token ? "" : "Token de convite ausente.");
  useEffect(() => { if (!token) return; void api.POST("/api/v1/invitations/staff/accept", { body: { token } }).then(({ data, error }) => { if (data?.accepted) setState("success"); else { setState("error"); setMessage(problemMessage(error)); } }); }, [token]);
  return <main className="content-grid grid min-h-[70vh] place-items-center py-12"><Card className="smooth-shadow-ring-lg shadow-black/40 w-full max-w-lg"><CardContent className="flex flex-col items-center p-10 text-center">{state === "loading" ? <LoaderCircle className="size-10 animate-spin text-primary" /> : state === "success" ? <CheckCircle2 className="size-12 text-cyan-300" /> : <UserCheck className="size-12 text-destructive" />}<h1 className="mt-5 text-2xl font-semibold text-white">{state === "loading" ? "Aceitando convite" : state === "success" ? "Você agora faz parte da portaria" : "Não foi possível aceitar"}</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">{state === "loading" ? "Validando o acesso ao evento." : state === "success" ? "Acesse os eventos atribuídos e comece a validar ingressos." : message}</p>{state !== "loading" && <Button asChild className="mt-6 w-full"><Link href={state === "success" ? "/portaria" : "/"}>{state === "success" ? "Ir para a portaria" : "Voltar ao início"}</Link></Button>}</CardContent></Card></main>;
}
