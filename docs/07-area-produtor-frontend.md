# Guia de integração da Área do Produtor

Este guia descreve o contrato necessário para o front-end implementar a adesão autônoma de produtores, a gestão de rascunhos e a moderação administrativa. Os tipos devem vir de `frontend/src/lib/api/schema.d.ts`; não crie interfaces paralelas.

## Pré-requisitos

Todas as rotas abaixo usam a sessão do Better Auth em cookie HttpOnly. O cliente já está configurado com `credentials: "include"` em `frontend/src/lib/api/client.ts`.

O cadastro público continua criando somente `customer`. Para ativar a Área do Produtor, a conta precisa ter:

- e-mail verificado;
- perfil completo em `PATCH /api/v1/profile`, incluindo CPF, telefone e endereço.

```ts
import { api } from '@/lib/api/client';

const { data, error } = await api.POST('/api/v1/organizer/activate');
if (error?.code === 'EMAIL_NOT_VERIFIED') {
  // Direcionar para a confirmação de e-mail.
}
if (error?.code === 'PROFILE_INCOMPLETE') {
  // Direcionar para a conclusão do perfil.
}
```

A chamada é idempotente. Repeti-la devolve `activated: true` e os mesmos papéis, sem duplicar a ativação.

## Estados do evento

```text
DRAFT ───────────────┐
                     ├─ submit ─> PENDING_REVIEW ─┬─ approve ─> PUBLISHED
REJECTED ── editar ─> DRAFT                       └─ reject ──> REJECTED

DRAFT | PENDING_REVIEW | REJECTED | PUBLISHED ── cancel ─> CANCELLED
```

| Estado | Ações do produtor |
|---|---|
| `DRAFT` | Editar dados, ingressos e imagens; enviar para análise; cancelar |
| `PENDING_REVIEW` | Consultar e cancelar; conteúdo fica bloqueado |
| `REJECTED` | Ler `rejectionReason`, editar e reenviar |
| `PUBLISHED` | Consultar, alterar somente capacidade e cancelar |
| `CANCELLED` | Somente consultar |

Ao editar qualquer conteúdo rejeitado, a API muda o estado para `DRAFT` e limpa os dados da revisão anterior.

## Jornada do produtor

1. Consultar `GET /api/v1/profile` e resolver verificação/perfil incompleto.
2. Ativar com `POST /api/v1/organizer/activate`.
3. Criar o rascunho com `POST /api/v1/organizer/events`.
4. Configurar tipos em `POST /api/v1/organizer/events/:id/ticket-types`.
5. Enviar capa e galeria como `multipart/form-data`.
6. Enviar para análise com `POST /api/v1/organizer/events/:id/submit`.
7. Acompanhar `status` e `rejectionReason` pela listagem de eventos do organizador.

```ts
const { data: submitted, error } = await api.POST(
  '/api/v1/organizer/events/{id}/submit',
  { params: { path: { id: eventId } } },
);

if (error?.code === 'EVENT_NOT_EDITABLE') {
  // Recarregar o evento: ele já foi enviado, publicado ou cancelado.
}
```

Para imagens, o navegador deve montar um `FormData` com o arquivo no campo `file`. A API aceita JPG, PNG e WebP de até 5 MB e valida MIME e assinatura binária.

## Moderação administrativa

A fila pode ser obtida com `GET /api/v1/admin/events?status=PENDING_REVIEW`. Para revisar todo o conteúdo, use `GET /api/v1/admin/events/:id`, que inclui produtor, categoria, imagens e tipos de ingresso.

```ts
await api.POST('/api/v1/admin/events/{id}/approve', {
  params: { path: { id: eventId } },
});

await api.POST('/api/v1/admin/events/{id}/reject', {
  params: { path: { id: eventId } },
  body: { reason: 'Informe uma descrição mais completa da programação.' },
});
```

A justificativa de rejeição deve ter entre 10 e 1000 caracteres. Aprovar ou rejeitar um evento fora de `PENDING_REVIEW` retorna `EVENT_NOT_PENDING_REVIEW`.

## Erros que exigem decisão de interface

| Código | Tratamento esperado |
|---|---|
| `EMAIL_NOT_VERIFIED` | Orientar confirmação do e-mail |
| `PROFILE_INCOMPLETE` | Abrir conclusão do perfil |
| `EVENT_NOT_EDITABLE` | Desabilitar edição e recarregar o estado atual |
| `EVENT_NOT_PENDING_REVIEW` | Atualizar a fila administrativa; outro admin já pode ter moderado |
| `FORBIDDEN` | Remover a ação da interface e informar falta de permissão |
| `VALIDATION_ERROR` | Exibir os erros associados aos campos |

As decisões devem usar `error.code`, nunca comparar mensagens em português.

## Rotas sugeridas

- `/produtor/ativar`: verificação dos pré-requisitos e ativação;
- `/produtor/eventos`: lista e estados dos próprios eventos;
- `/produtor/eventos/novo`: criação do rascunho;
- `/produtor/eventos/[id]`: dados, ingressos, imagens, revisão e rejeição;
- `/admin/eventos`: fila filtrada por `PENDING_REVIEW`;
- `/admin/eventos/[id]`: conferência, aprovação e rejeição.

O escopo atual não inclui CNPJ, repasses, pagamentos reais, equipes de produção ou perfil público de marca.
