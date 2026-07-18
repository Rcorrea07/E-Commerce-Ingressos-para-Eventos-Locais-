import { HttpException, HttpStatus } from '@nestjs/common';

export class ProblemException extends HttpException {
  constructor(code: string, detail: string, status: HttpStatus, extras?: Record<string, unknown>) {
    super({ code, detail, ...extras }, status);
  }
}
