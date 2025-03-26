import {
  Injectable,
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { CollaboratorService } from "src/services/collaborator.service"
import { ServiceService } from "src/services/service.service"
import { LoggingService } from "src/logging/logging.service"

@Injectable()
export class ServicePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private serviceService: ServiceService,
    private collaboratorService: CollaboratorService,
    private loggingService: LoggingService,
  ) {
    this.loggingService.setContext("ServicePermissionGuard")
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>("permission", context.getHandler())
    if (!requiredPermission) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user
    const params = request.params

    // Get service by owner, name and version
    const owner = decodeURIComponent(params.owner)
    const name = decodeURIComponent(params.name)
    const version = decodeURIComponent(params.version)

    this.loggingService.debug(
      `Checking permission "${requiredPermission}" for service ${owner}/${name}/${version}`,
      null,
      { userId: user.userId, username: user.username },
    )

    const service = await this.serviceService.findOneByOwnerNameAndVersion(owner, name, version)

    if (!service) {
      this.loggingService.warn(`Service not found: ${owner}/${name}/${version}`, null, {
        userId: user.userId,
        username: user.username,
      })

      throw new NotFoundException({
        message: `Service not found: ${owner}/${name}/${version}`,
        error: "Not Found",
      })
    }

    request.service = service

    // Check if user is owner
    const isOwner = await this.collaboratorService.isOwner(service._id, user.userId)
    if (isOwner) {
      this.loggingService.debug(
        `Permission granted (owner): ${requiredPermission} for service ${owner}/${name}/${version}`,
        null,
        { userId: user.userId, username: user.username, serviceId: service._id.toString() },
      )
      request.isOwner = true
      return true
    }

    // If permission is 'view', check if user is a collaborator
    if (requiredPermission === "view") {
      const isCollaborator = await this.collaboratorService.isCollaborator(service._id, user.userId)
      if (isCollaborator) {
        this.loggingService.debug(
          `Permission granted (collaborator): ${requiredPermission} for service ${owner}/${name}/${version}`,
          null,
          { userId: user.userId, username: user.username, serviceId: service._id.toString() },
        )
        request.isCollaborator = true
        return true
      }

      this.loggingService.warn(
        `Permission denied: ${requiredPermission} for service ${owner}/${name}/${version}`,
        null,
        { userId: user.userId, username: user.username, serviceId: service._id.toString() },
      )

      throw new ForbiddenException({
        message: `You don't have permission to view this service: ${owner}/${name}/${version}`,
        error: "Forbidden",
      })
    }

    // For 'delete' or other permissions, only owner is allowed
    this.loggingService.warn(
      `Permission denied (owner-only): ${requiredPermission} for service ${owner}/${name}/${version}`,
      null,
      { userId: user.userId, username: user.username, serviceId: service._id.toString() },
    )

    throw new ForbiddenException({
      message: `Only the owner can ${requiredPermission} this service: ${owner}/${name}/${version}`,
      error: "Forbidden",
    })
  }
}

