# API

Base da aplicação: `/api/v1`. Autenticação Better Auth: `/api/auth/*`. Swagger: `/docs`.

## Público e cliente

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/categories` | Categorias ativas |
| GET | `/events` | Busca, filtros, ordenação e paginação |
| GET | `/events/:slug` | Detalhe do evento |
| GET | `/events/:id/availability` | Estoque agregado |
| GET/PATCH | `/profile` | Perfil autenticado |
| POST | `/checkouts` | Criar e reservar; exige `Idempotency-Key` |
| GET | `/checkouts/active` | Retomar checkout |
| GET | `/checkouts/:id` | Detalhe e relógios do servidor |
| POST | `/checkouts/:id/heartbeat` | Renovar presença, não o TTL |
| POST | `/checkouts/:id/cancel` | Liberar reserva |
| POST | `/checkouts/:id/confirm` | Confirmar; exige `Idempotency-Key` |
| GET | `/orders` e `/orders/:id` | Histórico e detalhe |
| POST | `/orders/:id/cancel` | Cancelar; exige `Idempotency-Key` |
| GET | `/tickets` e `/tickets/:id` | Ingressos e QR assinado |

## Operação

- `/organizer/events/*`: eventos, publicação, cancelamento, tipos, capacidade, imagens e equipe;
- `/organizer/analytics`: métricas do organizador;
- `/gate/events` e `/gate/tickets/validate`: eventos atribuídos e leitura de QR;
- `/admin/users`, `/admin/organizer-invitations` e `/admin/analytics`: administração global;
- `/invitations/*/accept`: aceite autenticado de convite;
- `/health/live` e `/health/ready`: saúde do processo e dependências.

## Convenções

IDs são strings; datas ISO 8601 UTC; dinheiro usa `priceCents` e `currency: "BRL"`; paginação retorna `{ data, pagination }`. Falhas usam `application/problem+json` com `status`, `code`, `title`, `detail`, `requestId` e, quando aplicável, erros de campos.

O contrato completo e versionável está em [`openapi.json`](openapi.json); autenticação está em [`auth-openapi.json`](auth-openapi.json). O front deve usar o cliente gerado em `frontend/src/lib/api` para as rotas da aplicação e o cliente oficial do Better Auth para identidade.
