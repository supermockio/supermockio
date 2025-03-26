import { Injectable, type CanActivate, type ExecutionContext, ForbiddenException } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { Observable } from "rxjs"

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const requiredRoles = this.reflector.get<string[]>("roles", context.getHandler())
    if (!requiredRoles) {
      return true
    }

    const { user } = context.switchToHttp().getRequest()

    if (!user || !user.roles) {
      throw new ForbiddenException({
        message: "User has no roles assigned",
        error: "Forbidden"
      })
    }

    const hasRole = requiredRoles.some((role) => user.roles?.includes(role))

    if (!hasRole) {
      throw new ForbiddenException({
        message: `User does not have required roles: ${requiredRoles.join(", ")}`,
        error: "Forbidden"
      })
    }

    return true
  }
}

