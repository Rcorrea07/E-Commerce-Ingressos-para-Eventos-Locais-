# Plataforma de ingressos para eventos locais

Aplicação para divulgação, reserva temporária e emissão de ingressos. A compra não usa carrinho: o cliente seleciona os tipos na página do evento e, ao continuar, abre um checkout de um único evento que reserva unidades por até 15 minutos. O pagamento pode usar o gateway local simulado ou a Stripe exclusivamente em modo de teste.

## Stack

- Front-end: Next.js 16, React 19, TypeScript e Tailwind CSS;
- API: Node.js 22, NestJS 11, TypeScript, Prisma 7 e Zod 4;
- Identidade: Better Auth com sessões no MySQL;
- Pagamento: Stripe Payment Element em modo de teste, com webhook assinado, ou gateway simulado local;
- Infra local: MySQL 8.4, MinIO e Mailpit via Docker Compose;
- Contratos: OpenAPI e cliente TypeScript gerado com `openapi-typescript`/`openapi-fetch`.

## Execução completa

Requer Docker Desktop. Na raiz do projeto:

```bash
docker compose up --build
```

| Serviço | URL |
|---|---|
| Front-end | http://localhost:3000 |
| API | http://localhost:3001 |
| Swagger | http://localhost:3001/docs |
| MinIO Console | http://localhost:9001 |
| Mailpit | http://localhost:8025 |

As migrations, a criação do bucket e o seed são serviços one-shot e idempotentes. Credenciais locais de demonstração:

- `admin@ingressos.local` / `Admin123!Local`;
- `organizador@ingressos.local` / `Demo123!Local`;
- `portaria@ingressos.local` / `Demo123!Local`;
- `cliente@ingressos.local` / `Demo123!Local`.

Com `SEED_DEMO_DATA=true`, o seed também publica sete eventos fictícios em seis categorias, com capas fotográficas locais, tipos de ingresso, estoque e equipe de portaria. As imagens ficam em `backend/prisma/seed-assets/events` e são enviadas ao MinIO durante a inicialização.

Essas credenciais e os segredos do Compose são exclusivamente locais. Para outro ambiente, copie [`backend/.env.example`](backend/.env.example) e substitua todos os segredos.

### Stripe em modo de teste

O Compose mantém `PAYMENT_PROVIDER=simulated` por padrão. Para usar a Stripe, configure no ambiente antes de iniciar:

```env
PAYMENT_PROVIDER=stripe_test
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

O segredo `whsec_...` pode ser obtido localmente com o Stripe CLI:

```bash
stripe listen --forward-to localhost:3001/api/v1/payments/stripe/webhook
```

Depois, execute `docker compose up --build`. Somente chaves de teste são aceitas; chaves `sk_live_` e `pk_live_` fazem a API recusar a inicialização. Nunca registre esses valores no repositório.

## Deploy no Render

O arquivo [`render.yaml`](render.yaml) descreve o ambiente de produção com quatro serviços na mesma região: front-end, API, MySQL com disco persistente e MinIO com disco persistente. O Mailpit continua disponível apenas no Compose local; no Render, configure um provedor SMTP externo.

No Render, crie um Blueprint a partir do repositório e preencha os segredos solicitados:

- `PII_ENCRYPTION_KEY`: 64 caracteres hexadecimais;
- `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`: credenciais do administrador inicial;
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD` e `SMTP_FROM`;
- depois, se quiser pagamento de teste com Stripe, troque `PAYMENT_PROVIDER` para `stripe_test` e informe as três chaves `sk_test_`, `pk_test_` e `whsec_` no serviço da API.

O Blueprint executa as migrations antes de cada deploy, cria o bucket público de mídia e executa o seed inicial somente após o primeiro deploy. Não reutilize os segredos do `.env` local.

## Desenvolvimento

```bash
cd backend
npm install
npm run prisma:generate
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

Para atualizar contratos e o cliente:

```bash
cd backend && npm run openapi:generate
cd ../frontend && npm run api:generate
```

Documentação detalhada: [`docs/01-visao-geral.md`](docs/01-visao-geral.md), [`docs/03-regras-de-negocio.md`](docs/03-regras-de-negocio.md), [`docs/06-api.md`](docs/06-api.md) e [`docs/07-area-produtor-frontend.md`](docs/07-area-produtor-frontend.md).

## Equipe

- Rafael Corrêa Barbosa: gestão, documentação e estrutura compartilhada;
- Enzo: back-end, banco de dados, infraestrutura e contratos da API;
- Perroni: front-end público e autenticação;
- Marcelo Kian: seleção, checkout, histórico, painel e design responsivo.
