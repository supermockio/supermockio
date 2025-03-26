import { Injectable, type ExecutionContext, UnauthorizedException } from "@nestjs/common"
import { AuthGuard } from "@nestjs/passport"
import { LoggingService } from "src/logging/logging.service"

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private loggingService: LoggingService) {
    super()
    this.loggingService.setContext("JwtAuthGuard")
  }

  canActivate(context: ExecutionContext) {
    return super.canActivate(context)
  }

  handleRequest(err, user, info, context) {
    const request = context?.switchToHttp().getRequest()
    const path = request?.url || "unknown"
    const method = request?.method || "unknown"
    const ip = request?.ip || "unknown"

    if (err || !user) {
      const reason = info?.message || err?.message || "Invalid or expired token"
      this.loggingService.warn(`Authentication failed for ${method} ${path}`, null, { reason, ip })

      throw new UnauthorizedException({
        message: "Authentication failed",
        error: "Unauthorized",
        details: {
          reason,
        },
      })
    }

    this.loggingService.debug(`User authenticated for ${method} ${path}`, null, {
      userId: user.userId,
      username: user.username,
      ip,
    })

    return user
  }
}

