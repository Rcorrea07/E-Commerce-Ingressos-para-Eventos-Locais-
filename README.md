# Plataforma de ingressos para eventos locais

Aplicação para divulgação, reserva temporária e emissão simulada de ingressos. A compra não usa carrinho: o cliente seleciona os tipos na página do evento e, ao continuar, abre um checkout de um único evento que reserva unidades por até 15 minutos.

## Stack

- Front-end: Next.js 16, React 19, TypeScript e Tailwind CSS;
- API: Node.js 22, NestJS 11, TypeScript, Prisma 7 e Zod 4;
- Identidade: Better Auth com sessões no MySQL;
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

Essas credenciais e os segredos do Compose são exclusivamente locais. Para outro ambiente, copie [`backend/.env.example`](backend/.env.example) e substitua todos os segredos.

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

Documentação detalhada: [`docs/01-visao-geral.md`](docs/01-visao-geral.md), [`docs/03-regras-de-negocio.md`](docs/03-regras-de-negocio.md) e [`docs/06-api.md`](docs/06-api.md).

## Equipe

- Rafael Corrêa Barbosa: gestão, documentação e estrutura compartilhada;
- Enzo: back-end, banco de dados, infraestrutura e contratos da API;
- Perroni: front-end público e autenticação;
- Marcelo Kian: seleção, checkout, histórico, painel e design responsivo.
