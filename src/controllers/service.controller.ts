import {
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Param,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Request,
} from "@nestjs/common"
import { ServiceService } from "src/services/service.service"
import { createServiceDto } from "src/dtos/createServiceDto"
import { ResponseService } from "src/services/response.service"
import { FileInterceptor } from "@nestjs/platform-express"
import { parse } from "yaml"
import { MockerResponse } from "src/utils/MockerResponse"
import { ApiBody, ApiConsumes, ApiResponse, ApiTags } from "@nestjs/swagger"
import { FileUploadDto } from "src/dtos/FileUploadDto"
import { Service } from "src/schemas/service.schema"
import { Response } from "src/schemas/response.schema"
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard"
import { Express } from "express"
import { Permission } from "src/auth/decorators/permission.decorator"
import { ServicePermissionGuard } from "src/auth/guards/service-permission.guard"

@ApiTags("services")
@Controller("/api/services")
@UseGuards(JwtAuthGuard)
export class ServiceController {
  constructor(
    private readonly serviceService: ServiceService,
    private readonly responseService: ResponseService,
  ) {}

  @Get()
  @ApiResponse({
    status: 200,
    description: "List of services.",
    type: Service,
    example: [
      new Service("635sqsdd1587", "Test Service", "1.0.0", "Description here", {
        info: { title: "Test Service", version: "1.0.0" },
        paths: {
          "/tests": {},
        },
      }),
    ],
  })
  async getAllServices(@Request() req): Promise<Service[]> {
    // Get services where user is owner or collaborator
    return await this.serviceService.findAllForUser(req.user.userId)
  }

  @Get("/:name/:version")
  @UseGuards(ServicePermissionGuard)
  @Permission("view")
  async getServiceResponses(
    @Param("name") name: string,
    @Param("version") version: string,
  ): Promise<{ service: Service; responses: Response[] }> {
    name = decodeURIComponent(name)
    version = decodeURIComponent(version)

    const service = await this.serviceService.findOneByNameAndVersion(name, version)
  
    if (!service) throw new HttpException("The service cannot be found", HttpStatus.NOT_FOUND)
    const responses = await this.responseService.findByService(service._id)
    return { service, responses }
  }

  @ApiResponse({
    status: 200,
    description: "The OpenAPI specification for the specified service",
    schema: {
      example: {
        openapi: "3.0.0",
        info: { title: "My Service", version: "1.0.0", description: "Sample service" },
        paths: {},
      },
    },
  })
  @Get("/spec/:name/:version")
  @UseGuards(ServicePermissionGuard)
  @Permission("view")
  async getServiceSpec(@Param("name") name: string, @Param("version") version: string): Promise<any> {
    name = decodeURIComponent(name)
    version = decodeURIComponent(version)
    const service = await this.serviceService.findOneByNameAndVersion(name, version)
    if (!service) {
      throw new HttpException("The service cannot be found", HttpStatus.NOT_FOUND)
    }
    // Return only the openapi field
    return { openapi: service.openapi }
  }

  @ApiResponse({
    status: 200,
    description: "Delete a service and it's responses",
    type: MockerResponse,
    example: new MockerResponse(200, "Responses Deleted successfully"),
  })
  @Delete("/:name/:version")
  @UseGuards(ServicePermissionGuard)
  @Permission("delete")
  async deleteServicesResponses(@Param("name") name: string, @Param("version") version: string): Promise<any> {
    name = decodeURIComponent(name)
    version = decodeURIComponent(version)
    const service = await this.serviceService.findOneByNameAndVersion(name, version)
    if (!service) throw new HttpException("Service doesn't exists", HttpStatus.NOT_FOUND)
    await this.responseService.deleteByService(service._id)
    await this.serviceService.delete(service._id)
    return new MockerResponse(200, "Responses Deleted successfully")
  }

  @Post()
  @UseInterceptors(FileInterceptor("file"))
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    description: "openapi file",
    type: FileUploadDto,
  })
  @ApiResponse({
    status: 201,
    description: "The service has been successfully created.",
    type: MockerResponse,
    example: new MockerResponse(201, {
      message: "Service added successfully",
      service: {
        name: "Test Service",
        version: "1.0.0",
      },
    }),
  })
  async createService(
    @UploadedFile() file: Express.Multer.File,
    @Query("override") override: number = 0,
    @Request() req,
  ): Promise<any> {
    const newService = new createServiceDto()
    newService.openapi = parse(file.buffer.toString())
    const exist = await this.serviceService.findOneByNameAndVersion(
      newService.openapi.info.title,
      newService.openapi.info.version,
    )
    // override query param used to override an existing service
    if (override == 0 && exist) {
      if (exist) throw new HttpException("Service already exists", HttpStatus.CONFLICT)
    } else if (exist) {
      // Check if user is the owner before allowing override
      if (exist.owner.toString() !== req.user.userId) {
        throw new HttpException("Only the owner can override a service", HttpStatus.FORBIDDEN)
      }

      // delete the service and its responses if override != 0 and service exists
      await this.responseService.deleteByService(exist._id)
      await this.serviceService.delete(exist._id)
    }
    // persist service if it doesn't exist
    newService.name = newService.openapi.info.title
    newService.version = newService.openapi.info.version
    newService.description = newService.openapi.info.description ?? "-"

    // Set the current user as the owner
    newService.owner = req.user.userId

    const createdService = await this.serviceService.create(newService)
    if (!createdService) throw new HttpException("Error while adding the service", HttpStatus.INTERNAL_SERVER_ERROR)
    // save responses in DB with the new schema
    await this.serviceService.createServiceResponses(createdService)

    return new MockerResponse(201, {
      message: "Service added successfully",
      service: {
        name: createdService.name,
        version: createdService.version,
      },
    })
  }
}

