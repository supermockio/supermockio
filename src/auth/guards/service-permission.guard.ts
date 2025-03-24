import { Injectable, type CanActivate, type ExecutionContext, HttpException, HttpStatus } from "@nestjs/common"
import { Reflector } from "@nestjs/core"
import { CollaboratorService } from "src/services/collaborator.service"
import { ServiceService } from "src/services/service.service"

@Injectable() 
export class ServicePermissionGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private serviceService: ServiceService,
    private collaboratorService: CollaboratorService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermission = this.reflector.get<string>("permission", context.getHandler())
    if (!requiredPermission) {
      return true
    }

    const request = context.switchToHttp().getRequest()
    const user = request.user
    const params = request.params

    // Get service by name and version
    const name = decodeURIComponent(params.name)
    const version = decodeURIComponent(params.version)
    const service = await this.serviceService.findOneByNameAndVersion(name, version)

    if (!service) {
      throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
    }

    // Check if user is owner
    const isOwner = await this.collaboratorService.isOwner(service._id, user.userId)
    if (isOwner) {
      return true
    }

    // If permission is 'view', check if user is a collaborator
    if (requiredPermission === "view") {
      const isCollaborator = await this.collaboratorService.isCollaborator(service._id, user.userId)
      return isCollaborator
    }

    // For 'delete' or other permissions, only owner is allowed
    return false
  }
}

