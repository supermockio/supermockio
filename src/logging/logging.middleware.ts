import { Injectable, type NestMiddleware } from "@nestjs/common"
import { Request, Response, NextFunction } from "express"
import { LoggingService } from "./logging.service"

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  constructor(private readonly loggingService: LoggingService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const start = Date.now()
    const { method, originalUrl, ip } = req

    // Log request start
    this.loggingService.debug(`Incoming Request: ${method} ${originalUrl}`, "HTTP", { ip, headers: req.headers })

    // Add response listener to log when the request is completed
    res.on("finish", () => {
      const responseTime = Date.now() - start
      const { statusCode } = res

      // Log access information
      this.loggingService.access(req, res, responseTime)

      // Log detailed information based on status code
      if (statusCode >= 500) {
        this.loggingService.error(`Request ${method} ${originalUrl} failed with status ${statusCode}`, null, "HTTP", {
          responseTime: `${responseTime}ms`,
          ip,
        })
      } else if (statusCode >= 400) {
        this.loggingService.warn(`Request ${method} ${originalUrl} failed with status ${statusCode}`, "HTTP", {
          responseTime: `${responseTime}ms`,
          ip,
        })
      } else {
        this.loggingService.debug(`Request ${method} ${originalUrl} completed with status ${statusCode}`, "HTTP", {
          responseTime: `${responseTime}ms`,
          ip,
        })
      }
    })

    next()
  }
}

