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

## Organização, portaria e administração

- `POST /organizer/activate`: ativação autônoma da Área do Produtor para conta verificada e completa;
- `/organizer/events/*`: rascunhos, envio para análise, cancelamento, tipos, capacidade e imagens;
- `/organizer/events/:eventId/staff-invitations/*`: listar, criar e revogar convites da portaria;
- `/organizer/analytics`: totais, funil, disponibilidade, ocupação, ranking, validações e pedidos recentes dos próprios eventos;
- `/gate/events` e `/gate/tickets/validate`: eventos atribuídos e leitura de QR;
- `/admin/events`, `/admin/orders`, `/admin/tickets` e `/admin/users`: consultas globais paginadas;
- `/admin/events/:id/approve` e `/admin/events/:id/reject`: moderação e publicação de eventos;
- `/admin/analytics`: métricas globais;
- `/invitations/staff/accept`: aceite autenticado de convite da portaria;
- `/health/live` e `/health/ready`: saúde do processo e dependências.

Somente um convite de portaria pendente pode existir para o mesmo e-mail e evento. Convites aceitos, expirados ou revogados liberam uma nova tentativa. As respostas de listagem nunca incluem `tokenHash` nem a chave interna de deduplicação.

O fluxo detalhado para integrar a Área do Produtor está em [`07-area-produtor-frontend.md`](07-area-produtor-frontend.md).

## Convenções e contrato

IDs são strings; datas usam ISO 8601 UTC; dinheiro usa `priceCents` e `currency: "BRL"`; paginação retorna `{ data, pagination }`. Falhas usam `application/problem+json` com `status`, `code`, `title`, `detail`, `requestId` e, quando aplicável, erros de campos.

Cada operação no OpenAPI possui `summary`, schema de sucesso, erros esperados e indicação de autenticação por cookie quando protegida. O contrato completo está em [`openapi.json`](openapi.json); autenticação está em [`auth-openapi.json`](auth-openapi.json). O front deve usar o cliente gerado em `frontend/src/lib/api` para as rotas da aplicação e o cliente oficial do Better Auth para identidade.
