import {
    Body,
    Controller,
    Delete,
    Get,
    HttpException,
    HttpStatus,
    Param,
    Post,
    Request,
    UseGuards,
  } from "@nestjs/common"
  import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger"
  import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"
  import { AddCollaboratorDto, RemoveCollaboratorDto } from "src/dtos/collaborator.dto"
  import { ServiceService } from "src/services/service.service"
  import { CollaboratorService } from "src/services/collaborator.service"
  import { MockerResponse } from "src/utils/MockerResponse"
import { Permission } from "src/auth/decorators/permission.decorator"
import { ServicePermissionGuard } from "src/auth/guards/service-permission.guard"
  
  @ApiTags("collaborators")
  @Controller("/api/services/:name/:version/collaborators")
  @UseGuards(JwtAuthGuard)
  export class CollaboratorController {
    constructor(
      private readonly serviceService: ServiceService,
      private readonly collaboratorService: CollaboratorService,
    ) {}
  
    @Get()
    @UseGuards(ServicePermissionGuard)
    @Permission("view")
    @ApiOperation({ summary: "Get all collaborators for a service" })
    @ApiResponse({
      status: 200,
      description: "List of collaborators for the service",
    })
    async getCollaborators(@Param("name") name: string, @Param("version") version: string, @Request() req) {
      name = decodeURIComponent(name)
      version = decodeURIComponent(version)
  
      const service = await this.serviceService.findOneByNameAndVersion(name, version)
      if (!service) {
        throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
      }
  
      return this.collaboratorService.getCollaborators(service._id)
    }
  
    @Post()
    @ApiOperation({ summary: "Add a collaborator to a service" })
    @ApiResponse({
      status: 201,
      description: "Collaborator added successfully",
      type: MockerResponse,
    })
    async addCollaborator(
      @Param("name") name: string,
      @Param("version") version: string,
      @Body() addCollaboratorDto: AddCollaboratorDto,
      @Request() req,
    ) {
      name = decodeURIComponent(name)
      version = decodeURIComponent(version)
  
      const service = await this.serviceService.findOneByNameAndVersion(name, version)
      if (!service) {
        throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
      }
  
      // Check if user is owner
      const userId = req.user.userId
      if (service.owner.toString() !== userId) {
        throw new HttpException("Only the owner can add collaborators", HttpStatus.FORBIDDEN)
      }
  
      await this.collaboratorService.addCollaborator(service._id, addCollaboratorDto.email)
      return new MockerResponse(201, "Collaborator added successfully")
    }
  
    @Delete()
    @ApiOperation({ summary: "Remove a collaborator from a service" })
    @ApiResponse({
      status: 200,
      description: "Collaborator removed successfully",
      type: MockerResponse,
    })
    async removeCollaborator(
      @Param("name") name: string,
      @Param("version") version: string,
      @Body() removeCollaboratorDto: RemoveCollaboratorDto,
      @Request() req,
    ) {
      name = decodeURIComponent(name)
      version = decodeURIComponent(version)
  
      const service = await this.serviceService.findOneByNameAndVersion(name, version)
      if (!service) {
        throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
      }
  
      // Check if user is owner
      const userId = req.user.userId
      if (service.owner.toString() !== userId) {
        throw new HttpException("Only the owner can remove collaborators", HttpStatus.FORBIDDEN)
      }
  
      await this.collaboratorService.removeCollaborator(service._id, removeCollaboratorDto.email)
      return new MockerResponse(200, "Collaborator removed successfully")
    }
  }
  
  