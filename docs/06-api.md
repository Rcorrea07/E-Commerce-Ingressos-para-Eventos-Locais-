# Contrato da API

Este documento será atualizado pelo responsável pelo back-end.

## Usuários e autenticação

| Método | Endpoint | Função | Status |
|---|---|---|---|
| POST | `/api/auth/register` | Cadastrar usuário | Planejado |
| POST | `/api/auth/login` | Realizar login | Planejado |
| POST | `/api/auth/logout` | Encerrar sessão | Planejado |
| GET | `/api/auth/me` | Consultar usuário autenticado | Planejado |

## Eventos

| Método | Endpoint | Função | Status |
|---|---|---|---|
| GET | `/api/events` | Listar eventos | Planejado |
| GET | `/api/events/:id` | Consultar um evento | Planejado |
| POST | `/api/events` | Cadastrar evento | Planejado |
| PUT | `/api/events/:id` | Atualizar evento | Planejado |
| DELETE | `/api/events/:id` | Desativar evento | Planejado |

## Carrinho

| Método | Endpoint | Função | Status |
|---|---|---|---|
| GET | `/api/cart` | Consultar carrinho | Planejado |
| POST | `/api/cart/items` | Adicionar item | Planejado |
| PATCH | `/api/cart/items/:id` | Alterar quantidade | Planejado |
| DELETE | `/api/cart/items/:id` | Remover item | Planejado |

## Pedidos

| Método | Endpoint | Função | Status |
|---|---|---|---|
| POST | `/api/orders/confirm` | Confirmar pedido | Planejado |
| GET | `/api/orders/me` | Consultar histórico | Planejado |

## Administração

| Método | Endpoint | Função | Status |
|---|---|---|---|
| GET | `/api/admin/dashboard` | Consultar métricas | Planejado |

## Padrão de resposta

Cada endpoint deverá documentar:

- Dados recebidos;
- Dados devolvidos;
- Código de sucesso;
- Possíveis erros;
- Necessidade de autenticação;
- Necessidade de permissão administrativa.
