# Requisitos do sistema

## Funcionais

- RF01: listar, pesquisar e filtrar eventos publicados, mantendo esgotados visíveis;
- RF02: exibir detalhes, imagens, local, datas, tipos, preços e disponibilidade;
- RF03: cadastrar, autenticar, verificar e recuperar contas por e-mail;
- RF04: manter perfil brasileiro com telefone, CPF protegido e endereço;
- RF05: selecionar tipos e quantidades localmente na página do evento;
- RF06: iniciar checkout autenticado que reserva unidades por 15 minutos;
- RF07: permitir retomada, heartbeat, cancelamento e confirmação imutável do checkout;
- RF08: registrar pedido, snapshots e um ingresso por unidade;
- RF09: listar pedidos e ingressos do cliente e cancelar pedidos elegíveis;
- RF10: validar QR de uso único por equipe atribuída;
- RF11: administrar eventos, tipos, capacidade, mídia e convites;
- RF12: apresentar analytics de checkout, receita, ocupação e validações.

## Não funcionais

- RNF01: impedir oversell sob concorrência real no MySQL;
- RNF02: documentar a API em OpenAPI e gerar cliente TypeScript;
- RNF03: usar cookies HttpOnly, CORS explícito, rate limit, Helmet e logs redigidos;
- RNF04: armazenar datas em UTC e dinheiro em centavos de BRL;
- RNF05: subir o ambiente completo com `docker compose up --build`;
- RNF06: retornar erros no formato `application/problem+json` com `requestId`;
- RNF07: manter liveness e readiness separadas.
