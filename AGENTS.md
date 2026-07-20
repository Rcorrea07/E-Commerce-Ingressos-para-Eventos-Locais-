# AGENTS.md

Este arquivo orienta agentes e colaboradores que alterarem este repositório. As instruções valem para todo o projeto.

## Objetivo do projeto

Plataforma de ingressos para eventos locais com compra simulada, reserva concorrente de estoque, emissão individual de ingressos e validação por QR.

A jornada oficial é:

```text
evento → seleção local → checkout/reserva → confirmação → ingresso → portaria
```

## Regra principal: não existe carrinho

- Não criar `Cart`, `CartItem`, `/cart`, página de carrinho ou persistência da seleção anterior ao checkout.
- Tipos e quantidades são mantidos localmente pelo front na página do evento.
- A reserva começa somente em `POST /api/v1/checkouts`.
- Cada checkout pertence a exatamente um evento.
- Para alterar a seleção, o cliente cancela o checkout e inicia outro.

## Estrutura do repositório

| Diretório | Conteúdo |
|---|---|
| `frontend/` | Next.js, React, TypeScript e Tailwind CSS |
| `backend/` | NestJS, Prisma, Zod e Better Auth |
| `docs/` | Requisitos, decisões e contratos OpenAPI |
| `.github/` | CI e modelos de colaboração |

Leia antes de alterar regras importantes:

- `README.md` para execução geral;
- `backend/README.md` para arquitetura e integração com o front;
- `docs/03-regras-de-negocio.md` para invariantes do domínio;
- `docs/05-decisoes.md` para decisões arquiteturais;
- `docs/06-api.md` para visão resumida da API.

## Stack fixada

### Back-end

- Node.js 22;
- NestJS 11 em ESM;
- TypeScript estrito;
- Prisma 7;
- Zod 4 e `nestjs-zod`;
- Better Auth;
- MySQL 8.4;
- MinIO, Mailpit e Pino.

### Front-end

- Next.js 16 com App Router;
- React 19;
- TypeScript;
- Tailwind CSS;
- `openapi-fetch` para `/api/v1/*`;
- cliente oficial Better Auth para `/api/auth/*`.

Use npm e preserve as versões fixadas e os arquivos `package-lock.json`. Não trocar framework, banco, gerenciador de pacotes ou estratégia de autenticação sem uma decisão arquitetural explícita.

## Invariantes do domínio

### Identidade

- Cadastro público sempre cria um cliente.
- Papéis do domínio: `customer`, `organizer`, `gate_staff` e `admin`.
- Organizador acessa apenas seus eventos.
- Portaria valida apenas eventos atribuídos.
- Admin tem acesso global.
- Checkout exige e-mail verificado e perfil completo.
- CPF deve ser normalizado, validado e único.
- CPF é armazenado com AES-256-GCM e pesquisado por HMAC; nunca devolver o valor integral.

### Eventos e mídia

- Estados do evento: `DRAFT`, `PUBLISHED` e `CANCELLED`.
- Publicação exige categoria, local, capa, datas válidas e tipo de ingresso ativo.
- Eventos esgotados permanecem visíveis.
- Um evento possui uma capa e até seis imagens de galeria.
- Aceitar somente JPG, PNG e WebP de até 5 MB, validando MIME e assinatura binária.

### Estoque

- Cada ingresso possível corresponde a uma linha `TicketUnit`.
- Estados: `AVAILABLE`, `HELD` e `SOLD`.
- Reserva usa transação `READ COMMITTED`.
- Processar tipos em ordem estável.
- Selecionar unidades com `FOR UPDATE SKIP LOCKED`.
- Uma seleção com múltiplos tipos é atômica: tudo ou nada.
- Nunca permitir capacidade abaixo das unidades `HELD` ou `SOLD`.
- Não introduzir contadores de estoque que possam divergir das unidades.

### Checkout

- Prazo absoluto padrão de 15 minutos.
- Heartbeat esperado a cada 15 segundos.
- Após 60 segundos sem heartbeat, marcar como `ABANDONED` e liberar unidades.
- Heartbeat atualiza apenas presença e nunca renova `expiresAt`.
- Um usuário pode ter somente um checkout `ACTIVE`.
- Checkout iniciado é imutável.
- Estados: `ACTIVE`, `CONFIRMED`, `CANCELLED`, `EXPIRED` e `ABANDONED`.
- Criação e confirmação exigem `Idempotency-Key` no formato UUID.
- Nenhuma chamada externa deve ocorrer dentro da transação de estoque.

### Pedidos e QR

- Pagamento do MVP é simulado por `PaymentGateway`.
- Pedido preserva snapshots de evento, comprador, tipo e preço.
- Emitir um `IssuedTicket` para cada unidade vendida.
- QR contém somente ID público e assinatura HMAC.
- Primeira validação marca o ingresso como `USED`.
- Leituras seguintes retornam `TICKET_ALREADY_USED`.
- Cliente cancela somente até 48 horas antes do evento e se nenhum ingresso foi usado.
- Cancelamento devolve unidades ao estoque e invalida os ingressos.
- Preserve a ordem de locks entre evento, pedido, ingresso e unidade para evitar corridas entre validação e cancelamento.

## Princípios de escopo

Não adicionar ao MVP sem solicitação explícita:

- pagamento real;
- assentos numerados;
- transferência de ingresso;
- reembolso financeiro;
- Redis;
- microsserviços;
- fila virtual;
- ProxySQL;
- dual write;
- estoque agregado separado das `TicketUnit`.

Prefira a solução mais simples que preserve as invariantes e funcione com o Compose atual.

## Convenções da API

- Rotas da aplicação: `/api/v1/*`.
- Rotas de autenticação: `/api/auth/*`.
- Código, nomes de campos e enums em inglês.
- Documentação explicativa e resumos do Swagger em português.
- IDs como strings.
- Datas ISO 8601 em UTC.
- Dinheiro em centavos: `priceCents` e `currency: "BRL"`.
- Paginação no formato `{ data, pagination }`, padrão 20 e máximo 100.
- Erros no formato `application/problem+json`.
- Toda operação Swagger deve ter `@ApiOperation` com `summary` curto.
- Decisões do front devem usar `error.code`, nunca comparar mensagens humanas.
- Respostas de checkout devem considerar `serverTime`, `expiresAt` e `presenceExpiresAt`.

## Zod e OpenAPI

- Zod é a fonte dos DTOs de entrada.
- Não duplicar validação manualmente no controller se ela pertence ao schema.
- Ao criar ou alterar rota, atualizar o DTO Zod, os decorators Swagger e os testes relevantes.
- Não editar manualmente:
  - `docs/openapi.json`;
  - `docs/auth-openapi.json`;
  - `frontend/src/lib/api/schema.d.ts`.

Regere os artefatos:

```bash
cd backend
npm run openapi:generate

cd ../frontend
npm run api:generate
```

Depois da geração, confira que nenhuma operação da aplicação ficou sem `summary`.

## Integração no front-end

- Use `frontend/src/lib/api/client.ts` para a API da aplicação.
- Use `frontend/src/lib/auth-client.ts` para autenticação.
- Sempre enviar cookies com `credentials: "include"`.
- Não criar tipos manuais quando o tipo pode vir do OpenAPI.
- Seleção de ingresso é estado local da página do evento.
- Gere e preserve uma chave idempotente por tentativa de criação, confirmação ou cancelamento de pedido.
- Em timeout de rede, reutilize a mesma chave.
- Heartbeat roda apenas enquanto a tela do checkout está ativa.
- Ao sair, tente cancelar com `fetch(..., { keepalive: true })`.
- Não cancele no unmount causado pela navegação após confirmação bem-sucedida.
- O contador deve usar o horário do servidor e o prazo absoluto.
- HTTP 410 significa que o checkout não pode ser reativado.
- `ACTIVE_CHECKOUT_EXISTS` deve oferecer retomada ou cancelamento.

## Segurança e privacidade

- Nunca registrar CPF, endereço completo, senha, cookie, token ou QR integral.
- Não retornar campos sensíveis por conveniência do front.
- Não colocar segredos reais no repositório.
- Valores do Compose e do seed são somente para desenvolvimento local.
- Cookies de autenticação permanecem HttpOnly.
- Preserve CORS explícito, Helmet e os rate limits existentes.
- Toda ação administrativa ou transacional importante deve produzir auditoria.
- Atualizações de dependências devem terminar com `npm audit --omit=dev` sem vulnerabilidades de produção conhecidas.

## Banco e migrations

- Toda mudança persistente deve ser representada em `prisma/schema.prisma` e em uma migration.
- Não editar migrations já aplicadas; crie outra migration.
- Gere o Prisma Client depois de mudar o schema.
- Seeds devem ser idempotentes.
- Não executar reset destrutivo do banco sem autorização explícita.
- Testes de concorrência devem usar MySQL real; SQLite ou mocks não validam `SKIP LOCKED`.

## Docker

O comando de referência é:

```bash
docker compose up --build
```

O ambiente deve disponibilizar:

- front em `:3000`;
- API em `:3001`;
- Swagger em `:3001/docs`;
- MinIO em `:9000` e console em `:9001`;
- Mailpit em `:8025`;
- MySQL em `:3306`.

Migrations, criação do bucket e seed são serviços one-shot. Não usar tags `latest` em imagens externas.

## Testes obrigatórios conforme a alteração

### Sempre

```bash
cd backend
npm run typecheck
npm run lint
npm test
npm run build

cd ../frontend
npm run lint
npm run build
```

### Se alterar estoque, checkout, pedido ou QR

Execute também:

```bash
cd backend
RUN_INTEGRATION=true npm test
```

Preserve os testes que garantem:

- 100 tentativas para 10 unidades criam exatamente 10 reservas;
- múltiplos tipos reservam tudo ou nada;
- idempotência não duplica recursos;
- heartbeat não reativa checkout terminal;
- abandono libera unidades;
- cancelamento concorrente com QR nunca devolve unidade usada.

### Se alterar Docker ou inicialização

- Validar `docker compose config --quiet`.
- Executar o Compose completo.
- Conferir `/health/live`, `/health/ready`, `/docs` e o front.
- Quando solicitado, fazer smoke test partindo de volumes vazios.

## Antes de concluir uma tarefa

1. Revise o diff e preserve alterações não relacionadas de outros colaboradores.
2. Confirme que nenhuma referência a carrinho persistente foi introduzida.
3. Rode as verificações proporcionais ao risco.
4. Regenere OpenAPI e cliente quando contratos mudarem.
5. Atualize README ou `docs/` quando uma decisão ou fluxo mudar.
6. Informe claramente o que foi alterado, o que foi testado e qualquer limitação restante.

Não faça commit, push, abertura de PR ou remoção de volumes sem pedido explícito do usuário.
