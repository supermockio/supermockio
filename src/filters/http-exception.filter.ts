import { type ExceptionFilter, Catch, type ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common"
import { Request, Response } from "express"
import { LoggingService } from "src/logging/logging.service"

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
    constructor(private readonly loggingService: LoggingService) {
        this.loggingService.setContext(HttpExceptionFilter.name)
    }

    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp()
        const response = ctx.getResponse<Response>()
        const request = ctx.getRequest<Request>()

        let status = HttpStatus.INTERNAL_SERVER_ERROR
        let message = "Internal server error"
        let errorData = null

        if (exception instanceof HttpException) {
            status = exception.getStatus()
            const exceptionResponse = exception.getResponse()

            if (typeof exceptionResponse === "object") {
                message = exceptionResponse["message"] || exception.message
                errorData = exceptionResponse["error"] || null
            } else {
                message = exceptionResponse || exception.message
            }
        } else {
            this.loggingService.error(
                `Unhandled exception: ${exception.message}`,
                exception.stack,
                HttpExceptionFilter.name,
                {
                    path: request.url,
                    method: request.method,
                    ip: request.ip,
                },
            )
        }

        // Log all exceptions
        if (status >= 500) {
            this.loggingService.error(
                `${request.method} ${request.url} failed with status ${status}: ${message}`,
                exception.stack,
                HttpExceptionFilter.name,
                {
                    error: errorData,
                },
            )
        } else if (status >= 400) {
            this.loggingService.warn(
                `${request.method} ${request.url} failed with status ${status}: ${message}`,
                HttpExceptionFilter.name,
                {
                    error: errorData,
                },
            )
        }

        response.status(status).json({
            status,
            message,
            error: errorData,
            timestamp: new Date().toISOString(),
            path: request.url,
        })
    }
}

