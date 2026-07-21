import { applyDecorators } from '@nestjs/common';
import { ApiCookieAuth, ApiExtraModels, ApiResponse, getSchemaPath } from '@nestjs/swagger';
import { ProblemDetailsDto } from './openapi.dto.js';

const descriptions: Record<number, string> = {
  400: 'Requisição inválida',
  401: 'Autenticação necessária',
  403: 'Operação não autorizada',
  404: 'Recurso não encontrado',
  409: 'Conflito com o estado atual',
  410: 'Recurso expirado ou encerrado',
  413: 'Arquivo maior que o limite permitido',
  422: 'Regra de negócio não atendida',
  429: 'Limite de requisições excedido',
  503: 'Dependência indisponível'
};

export function ApiProblems(...statuses: number[]) {
  return applyDecorators(
    ApiExtraModels(ProblemDetailsDto),
    ...[...new Set(statuses)].map((status) => ApiResponse({
      status,
      description: descriptions[status] ?? 'Erro da operação',
      content: { 'application/problem+json': { schema: { $ref: getSchemaPath(ProblemDetailsDto) } } }
    }))
  );
}

export function ApiProtected(...statuses: number[]) {
  return applyDecorators(ApiCookieAuth('cookie'), ApiProblems(401, 403, ...statuses));
}
