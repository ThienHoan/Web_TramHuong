import {
    ExceptionFilter,
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
    Logger,
} from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { Request } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    private readonly logger = new Logger(AllExceptionsFilter.name);

    constructor(private readonly httpAdapterHost: HttpAdapterHost) { }

    catch(exception: unknown, host: ArgumentsHost): void {
        const { httpAdapter } = this.httpAdapterHost;
        const ctx = host.switchToHttp();
        const request = ctx.getRequest<Request>(); // Explicitly type as Express Request

        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const responseBody = {
            statusCode: httpStatus,
            timestamp: new Date().toISOString(),
            path: httpAdapter.getRequestUrl(request),
            requestId: request.headers['x-request-id'] || null, // Capture Request ID if available
            message: 'Internal server error',
            errors: undefined as string[] | undefined,
            error: undefined as string | undefined,
        };

        // Extract message and details
        if (exception instanceof HttpException) {
            const response = exception.getResponse() as any;

            // Standard NestJS structure often puts the message in `message`
            // If validation fails, `message` is often an array of strings
            if (typeof response === 'object' && response !== null) {
                responseBody.error = response.error || exception.message;

                if (Array.isArray(response.message)) {
                    // Validation errors usually come here as string[]
                    responseBody.message = 'Validation failed';
                    responseBody.errors = response.message;
                } else {
                    responseBody.message = response.message || exception.message;
                }
            } else {
                responseBody.message = typeof response === 'string' ? response : exception.message;
            }
        } else {
            // Unknown Error (system error)
            responseBody.message = 'Internal server error';
            // In production, we might not want to send the raw stack trace
            // But logging it is crucial
        }

        // Log the error with context
        this.logger.error(
            `[${request.method}] ${responseBody.path} >> Status: ${httpStatus}, Message: ${JSON.stringify(
                responseBody.message,
            )}`,
            exception instanceof Error ? exception.stack : String(exception),
        );

        httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
    }
}
