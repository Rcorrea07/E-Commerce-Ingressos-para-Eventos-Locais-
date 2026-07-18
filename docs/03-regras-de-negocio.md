# Regras de negócio

- RN01: eventos publicados são públicos; eventos esgotados continuam visíveis;
- RN02: cadastro público sempre começa com papel `customer`;
- RN03: checkout exige sessão, e-mail verificado e perfil completo;
- RN04: CPF é válido e único, criptografado com AES-256-GCM e indexado por HMAC;
- RN05: um checkout contém ingressos de somente um evento e sua seleção é imutável;
- RN06: um usuário pode ter no máximo um checkout `ACTIVE`;
- RN07: a reserva dura no máximo 15 minutos e exige heartbeat; 60 segundos sem presença causam abandono;
- RN08: heartbeat atualiza presença, mas nunca renova o prazo absoluto;
- RN09: cada ingresso é uma `TicketUnit` em `AVAILABLE`, `HELD` ou `SOLD`;
- RN10: reserva de múltiplos tipos é atômica: todos os tipos ou nenhum;
- RN11: capacidade nunca pode cair abaixo das unidades reservadas ou vendidas;
- RN12: primeira leitura autorizada do QR marca `USED`; as seguintes falham;
- RN13: cliente cancela até 48 horas antes do evento se nenhum ingresso foi usado;
- RN14: cancelamento de pedido invalida QRs e devolve unidades ao estoque;
- RN15: cancelamento de evento encerra vendas, libera checkouts e cancela ingressos;
- RN16: organizador acessa apenas seus eventos, portaria apenas eventos atribuídos e admin possui acesso global;
- RN17: criação/confirmacão de checkout e cancelamento de pedido exigem `Idempotency-Key`;
- RN18: pagamento do MVP é simulado por uma implementação de `PaymentGateway`.
