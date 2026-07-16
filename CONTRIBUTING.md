# Guia de Contribuição

## Regra principal

Nenhum integrante deverá desenvolver uma funcionalidade diretamente na branch `main`.

## Antes de começar uma tarefa

1. A tarefa deve existir como uma Issue no GitHub.
2. A Issue deve possuir responsável.
3. O responsável deve atualizar sua branch local.
4. Deve ser criada uma branch específica para a tarefa.

## Nomes de branches

```text
feat/numero-descricao
fix/numero-descricao
docs/numero-descricao
refactor/numero-descricao
```

Exemplos:

```text
feat/12-home-vitrine
feat/15-carrinho
fix/21-card-mobile
docs/8-regras-negocio
```

## Commits

Use mensagens objetivas:

```text
feat: cria hero da página inicial
feat: adiciona cards de eventos
fix: corrige responsividade do card
docs: atualiza regras de negócio
style: ajusta espaçamento da navbar
refactor: reorganiza componentes
test: adiciona testes de autenticação
chore: configura estrutura inicial
```

## Pull Request

Todo trabalho deve ser enviado por Pull Request para a branch `main`.

O Pull Request deve informar:

- O que foi desenvolvido;
- Qual Issue está relacionada;
- Como testar;
- Evidências visuais, quando aplicável;
- Possíveis pendências.

## Critério de conclusão

Uma tarefa será considerada concluída quando:

- O código estiver funcionando;
- Os critérios de aceite forem atendidos;
- O código estiver no GitHub;
- O Pull Request estiver revisado;
- O Pull Request estiver integrado à `main`;
- A Issue estiver fechada.
