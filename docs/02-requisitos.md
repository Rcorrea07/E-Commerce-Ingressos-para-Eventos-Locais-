# Requisitos do Sistema

## Requisitos funcionais

### RF01 — Visualizar eventos

O sistema deve permitir que qualquer visitante visualize os eventos disponíveis.

### RF02 — Filtrar eventos

O usuário deve conseguir filtrar eventos por categoria e data.

### RF03 — Visualizar detalhes

O usuário deve conseguir abrir a página de um evento e consultar descrição, local, data, horário e tipos de ingresso.

### RF04 — Cadastrar usuário

O sistema deve permitir o cadastro de usuários.

### RF05 — Autenticar usuário

O sistema deve permitir login e logout.

### RF06 — Adicionar ao carrinho

Somente usuários autenticados devem conseguir adicionar ingressos ao carrinho.

### RF07 — Alterar o carrinho

O usuário deve conseguir aumentar, diminuir ou remover itens do carrinho.

### RF08 — Consultar disponibilidade

O sistema deve consultar a disponibilidade dos ingressos.

### RF09 — Confirmar pedido

O sistema deve permitir uma confirmação simulada do pedido, sem pagamento real.

### RF10 — Registrar histórico

Os pedidos confirmados devem ser registrados no histórico do usuário.

### RF11 — Administrar eventos

Um administrador deve conseguir cadastrar, editar e desativar eventos.

### RF12 — Consultar métricas

O painel administrativo deve apresentar informações básicas sobre eventos, pedidos e ingressos.

## Requisitos não funcionais

### RNF01 — Responsividade

A interface deve funcionar em celulares, tablets e computadores.

### RNF02 — Persistência

Usuários, eventos, carrinhos e pedidos devem ser persistidos no banco de dados.

### RNF03 — Segurança

Senhas não podem ser armazenadas em texto puro.

### RNF04 — Integridade de estoque

O sistema não pode confirmar uma quantidade superior à disponibilidade.

### RNF05 — Organização

O código deve estar dividido em componentes e módulos com responsabilidades claras.

### RNF06 — Documentação

As decisões, regras e instruções de execução devem ser documentadas continuamente.
