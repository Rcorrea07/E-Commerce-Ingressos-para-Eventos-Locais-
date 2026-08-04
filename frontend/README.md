# Pulso — front-end

Interface da plataforma de eventos locais. A identidade Pulso usa tema escuro fixo, violeta e ciano como acentos e adapta a expressão visual ao contexto: descoberta mais imersiva no público e operação mais sóbria nos painéis.

## Stack

- Next.js 16, React 19 e TypeScript;
- Tailwind CSS 4 e componentes shadcn/ui;
- `openapi-fetch` para `/api/v1/*`;
- cliente Better Auth para `/api/auth/*`;
- ZXing para leitura de QR e `qrcode` para a carteira digital.

## Jornadas disponíveis

- descoberta, filtros e detalhes de eventos;
- seleção local de ingressos, checkout temporário e confirmação simulada;
- autenticação, verificação de e-mail, recuperação de senha e perfil;
- pedidos, cancelamento elegível, carteira e QR individual;
- ativação e painel do produtor, eventos, ingressos, mídia e portaria;
- leitura manual ou por câmera na portaria;
- analytics, moderação, auditoria e categorias no admin.

A seleção de ingressos não é um carrinho: ela existe apenas na página do evento e a reserva começa em `POST /api/v1/checkouts`.

## Execução

Na raiz do repositório, o ambiente completo é iniciado com:

```bash
docker compose up --build
```

Para executar somente o front em desenvolvimento:

```bash
npm install
npm run dev
```

O front usa `NEXT_PUBLIC_API_URL`, com fallback para `http://localhost:3001`.

## Verificação

```bash
npm run lint
npm run build
```

Após mudanças no contrato da API:

```bash
npm run api:generate
```
