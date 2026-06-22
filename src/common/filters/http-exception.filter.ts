import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === 'object' && exceptionResponse !== null) {
        const resp = exceptionResponse as Record<string, unknown>;
        message = (resp.message as string | string[]) || exception.message;
        error = (resp.error as string) || 'Error';
      } else {
        message = exception.message;
      }
    } else if (exception instanceof Error) {
      message = exception.message;
      console.error('Unhandled exception:', exception.stack);
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      error,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
