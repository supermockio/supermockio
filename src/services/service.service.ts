import { Injectable } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { createServiceDto } from "src/dtos/createServiceDto"
import { Service } from "src/schemas/service.schema"
import { ResponseService } from "./response.service"
import { CreateResponseDto } from "src/dtos/createResponseDto"
import { MockerUtils, Parameter } from "src/utils/MockerUtils"
import { engine, setEngineLoggingService } from "src/utils/examples-engine/example-resolution-engine"
import { ExampleResolutionContext } from "src/utils/examples-engine/rules/rules.type"
import { User } from "src/schemas/user.schema"
import { LoggingService } from "src/logging/logging.service"

@Injectable()
export class ServiceService {
  constructor(
    @InjectModel(Service.name) private readonly serviceModel: Model<Service>,
    @InjectModel(User.name) private readonly userModel: Model<User>,
    private readonly responseService: ResponseService,
    private readonly loggingService: LoggingService
  ) {
    this.loggingService.setContext('ServiceService');
    
    // Initialize the logging for the example engine
    setEngineLoggingService(this.loggingService);
    
    // Initialize MockerUtils with logging
    new MockerUtils(this.loggingService);
  }

  async create(createServiceDto: createServiceDto): Promise<Service> {
    try {
      this.loggingService.debug("Creating new service", null, {
        name: createServiceDto.name,
        version: createServiceDto.version,
        owner: createServiceDto.owner,
      })

      const createdService = await this.serviceModel.create(createServiceDto)

      this.loggingService.debug("Service created successfully", null, {
        serviceId: createdService._id.toString(),
        name: createdService.name,
        version: createdService.version,
      })

      return createdService
    } catch (error) {
      this.loggingService.error(`Error creating service: ${error.message}`, error.stack, null, {
        name: createServiceDto.name,
        version: createServiceDto.version,
      })
      throw error
    }
  }

  // TODO: Admin only
  async findAll(): Promise<Service[]> {
    try {
      this.loggingService.debug("Finding all services")
      return this.serviceModel.find().select(["name", "version", "description", "openapi"])
    } catch (error) {
      this.loggingService.error(`Error finding all services: ${error.message}`, error.stack)
      throw error
    }
  }

  async findAllForUser(userId: string): Promise<Service[]> {
    try {
      this.loggingService.debug(`Finding all services for user: ${userId}`)

      const services = await this.serviceModel
        .find({
          $or: [{ owner: userId }, { collaborators: userId }],
        })
        .select(["name", "version", "description", "openapi", "owner", "collaborators"])
        .populate({ path: "collaborators", select: "email username" })
        .populate("owner", ["email", "username"])

      this.loggingService.debug(`Found ${services.length} services for user: ${userId}`)

      return services
    } catch (error) {
      this.loggingService.error(`Error finding services for user: ${error.message}`, error.stack, null, {
        userId,
      })
      throw error
    }
  }

  async findOneByOwnerNameAndVersion(ownerUsername: string, name: string, version: string): Promise<Service> {
    try {
      this.loggingService.debug(`Finding service by owner, name, and version: ${ownerUsername}/${name}@${version}`)

      // First find the owner by username
      const owner = await this.userModel.findOne({ username: ownerUsername }).exec()
      if (!owner) {
        this.loggingService.warn(`Owner not found: ${ownerUsername}`)
        return null
      }

      // Then find the service by owner, name, and version
      const service = await this.serviceModel
        .findOne({
          owner: owner._id,
          name,
          version,
        })
        .populate({ path: "collaborators", select: "email username" })
        .populate("owner", ["email", "username"])
        .exec()

      if (service) {
        this.loggingService.debug(`Found service: ${ownerUsername}/${name}@${version}`, null, {
          serviceId: service._id.toString(),
        })
      } else {
        this.loggingService.warn(`Service not found: ${ownerUsername}/${name}@${version}`)
      }

      return service
    } catch (error) {
      this.loggingService.error(`Error finding service by owner, name, and version: ${error.message}`, error.stack, null, {
        owner: ownerUsername,
        name,
        version,
      })
      throw error
    }
  }

  async delete(id: Types.ObjectId) {
    try {
      this.loggingService.debug(`Deleting service: ${id.toString()}`)

      const deletedService = await this.serviceModel.findByIdAndDelete({ _id: id }).exec()

      if (deletedService) {
        this.loggingService.debug(`Service deleted successfully: ${id.toString()}`)
      } else {
        this.loggingService.warn(`Service not found for deletion: ${id.toString()}`)
      }

      return deletedService
    } catch (error) {
      this.loggingService.error(`Error deleting service: ${error.message}`, error.stack, null, {
        serviceId: id.toString(),
      })
      throw error
    }
  }

  async createServiceResponses(createdService: Service) {
    try {
      this.loggingService.debug(`Creating responses for service: ${createdService._id.toString()}`, null, {
        name: createdService.name,
        version: createdService.version,
      })

      const paths = createdService.openapi["paths"]
      if (!paths) {
        this.loggingService.warn(`No paths found in OpenAPI spec for service: ${createdService._id.toString()}`)
        return
      }

      const creationPromises = []

      // Iterate over all defined paths in the OpenAPI spec.
      for (const path in paths) {
        const methods = paths[path]
        for (const method in methods) {
          const operation = methods[method]

          this.loggingService.debug(`Processing operation: ${method.toUpperCase()} ${path}`, null, {
            operationId: operation.operationId,
          })

          try {
            // Generate a dynamic path by replacing any path parameters.
            const generatedPath = await MockerUtils.generatePath(
              path,
              Parameter.arrayFrom(operation.parameters, createdService.openapi),
              createdService.openapi,
            )

            this.loggingService.debug(`Generated path: ${generatedPath}`, null, {
              originalPath: path,
            })

            // For each response code defined in the operation.
            const responseCodes = Object.keys(operation.responses)
            this.loggingService.debug(`Found ${responseCodes.length} response codes for operation`)

            const responsePromises = responseCodes.map(async (code) => {
              try {
                this.loggingService.debug(`Processing response code: ${code}`, null, {
                  path: generatedPath,
                  method,
                })

                // Build the context for our example resolution rules.
                const context: ExampleResolutionContext = {
                  responseDefinition: operation.responses[code],
                  openapi: createdService.openapi,
                  operation: {
                    ...operation,
                    path,
                    method,
                  },
                }
                

                this.loggingService.debug(`Context built for response code: ${code} ${JSON.stringify(context)}`, null, {
                  context,
                })

                // Resolve the example(s) for the given response.
                const resolutionResult = await engine.resolve(context)

                // If a resolution result is returned, iterate over each example.
                if (resolutionResult && resolutionResult.examples.length > 0) {
                  this.loggingService.debug(
                    `Resolution successful, creating ${resolutionResult.examples.length} responses`, null,
                    {
                      exampleNames: resolutionResult.exampleNames,
                    },
                  )

                  // For each example, create a separate response record.
                  const recordPromises = resolutionResult.examples.map(async (example, index) => {
                    try {
                      const responseDto = {
                        method,
                        path: generatedPath,
                        service: createdService._id,
                        statusCode: Number.parseInt(code),
                        content: example,
                        // Save the example name if provided (e.g. from the MultipleExamplesRule)
                        exampleName: resolutionResult.exampleNames ? resolutionResult.exampleNames[index] : null,
                      } as CreateResponseDto

                      const response = await this.responseService.create(responseDto)

                      this.loggingService.debug(`Response created successfully`, null, {
                        responseId: response._id.toString(),
                        statusCode: response.statusCode,
                        exampleName: response.exampleName,
                      })

                      return response
                    } catch (recordError) {
                      this.loggingService.error(
                        `Error creating response record: ${recordError.message}`,
                        recordError.stack, null,
                        {
                          path: generatedPath,
                          method,
                          statusCode: code,
                          exampleName: resolutionResult.exampleNames ? resolutionResult.exampleNames[index] : null,
                        },
                      )
                      throw recordError
                    }
                  })

                  return Promise.all(recordPromises)
                } else {
                  this.loggingService.warn(`No resolution result available, creating fallback response`, null, {
                    path: generatedPath,
                    method,
                    statusCode: code,
                  })

                  // Fallback: if no resolution result is available, create a response with an empty object.
                  const fallbackDto = {
                    method,
                    path: generatedPath,
                    service: createdService._id,
                    statusCode: Number.parseInt(code),
                    content: {},
                    exampleName: "fallback",
                  } as CreateResponseDto

                  const response = await this.responseService.create(fallbackDto)

                  this.loggingService.debug(`Fallback response created successfully`, null, {
                    responseId: response._id.toString(),
                    statusCode: response.statusCode,
                  })

                  return response
                }
              } catch (codeError) {
                this.loggingService.error(
                  `Error processing response code ${code}: ${codeError.message}`,
                  codeError.stack, null,
                  {
                    path: generatedPath,
                    method,
                  },
                )

                // Create a fallback response on error
                const errorFallbackDto = {
                  method,
                  path: generatedPath,
                  service: createdService._id,
                  statusCode: Number.parseInt(code),
                  content: { error: "Error generating example" },
                  exampleName: "error-fallback",
                } as CreateResponseDto

                return this.responseService.create(errorFallbackDto)
              }
            })

            creationPromises.push(Promise.all(responsePromises))
          } catch (operationError) {
            this.loggingService.error(`Error processing operation: ${operationError.message}`, operationError.stack, null, {
              path,
              method,
            })
            // Continue with other operations
          }
        }
      }

      await Promise.all(creationPromises)
      this.loggingService.debug(`All responses created for service: ${createdService._id.toString()}`)
    } catch (error) {
      this.loggingService.error(`Error creating service responses: ${error.message}`, error.stack, null, {
        serviceId: createdService._id.toString(),
        name: createdService.name,
        version: createdService.version,
      })
      throw error
    }
  }
}

