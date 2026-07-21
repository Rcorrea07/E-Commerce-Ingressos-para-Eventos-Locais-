# Visão geral

## Objetivo

Oferecer uma plataforma responsiva para descobrir eventos locais, selecionar tipos de ingresso, reservar estoque durante o checkout, confirmar pedidos simulados, emitir ingressos individuais e validá-los na portaria.

## Jornada

```text
evento → seleção local → checkout/reserva → confirmação → ingresso com QR → validação
```

A seleção anterior ao checkout vive somente no estado do front-end. Não há carrinho persistente. Cada checkout pertence a um evento e a reserva começa ao clicar em **Continuar**.

## Perfis

- Cliente: pesquisa, compra, consulta e cancela pedidos elegíveis;
- Organizador: ativa a Área do Produtor com perfil completo e administra somente os próprios eventos, estoque, imagens, equipe e métricas;
- Portaria: valida ingressos apenas dos eventos atribuídos;
- Administrador: acesso global a eventos, pedidos, ingressos, usuários, analytics, categorias e moderação de eventos.

Os papéis são cumulativos.

Eventos são criados em `DRAFT`, enviados para `PENDING_REVIEW` e somente ficam públicos após aprovação administrativa. Uma rejeição retorna o evento ao produtor com justificativa para edição e reenvio.

## Fora do MVP

Pagamento real, assentos numerados, reembolso financeiro, transferência de titularidade, fila virtual, Redis, microsserviços e aplicativo móvel nativo.
