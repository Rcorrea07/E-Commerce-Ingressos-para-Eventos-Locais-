# Decisões arquiteturais

- DEC-001: monorepositório com `frontend/`, `backend/` e `docs/`;
- DEC-002: Next.js no front e API ESM NestJS/TypeScript no back;
- DEC-003: MySQL 8.4 com Prisma 7 e schemas Zod como fonte dos DTOs/OpenAPI;
- DEC-004: Better Auth para credenciais, sessões, verificação e recuperação;
- DEC-005: checkout direto, sem `Cart` ou `CartItem` persistentes;
- DEC-006: uma linha `TicketUnit` por ingresso, inspirada na reserva de inventário da Shopify;
- DEC-007: transação `READ COMMITTED`, ordem estável e `FOR UPDATE SKIP LOCKED` para evitar oversell;
- DEC-008: TTL absoluto de 15 minutos, heartbeat a cada 15 segundos e abandono após 60 segundos;
- DEC-009: MinIO para uma capa e até seis imagens de galeria; falhas de remoção entram em fila persistente;
- DEC-010: pagamento real fora do MVP; `PaymentGateway` simulado preserva o ponto de extensão;
- DEC-011: OpenAPI da aplicação e do Better Auth separados, ambos selecionáveis no Swagger;
- DEC-012: Docker Compose executa migrations, bucket e seed como serviços one-shot;
- DEC-013: não adotar Redis, microsserviços, assentos, fila virtual, ProxySQL ou dual write no MVP.
- DEC-014: adesão de organizador é autônoma para contas verificadas e completas; a confiança é aplicada por moderação administrativa de cada evento antes da publicação.
