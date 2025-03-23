import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createServiceDto } from 'src/dtos/createServiceDto';
import { Service } from 'src/schemas/service.schema';
import { ResponseService } from './response.service';
import { CreateResponseDto } from 'src/dtos/createResponseDto';
import { MockerUtils, Parameter } from 'src/utils/MockerUtils';
import { engine } from 'src/utils/examples-engine/example-resolution-engine';
import { ExampleResolutionContext } from 'src/utils/examples-engine/rules/rules.type';


@Injectable()
export class ServiceService {

  constructor(@InjectModel(Service.name) private readonly serviceModel: Model<Service>, private readonly responseService: ResponseService) {

  }

  async create(createServiceDto: createServiceDto): Promise<Service> {
    const createdService = await this.serviceModel.create(createServiceDto);

    return createdService;
  }

  async findAll(): Promise<Service[]> {
    return this.serviceModel.find().select(
      ["name", "version", "description", "openapi"]
    );
  }

  async findOne(id: string): Promise<Service> {
    return this.serviceModel.findOne({ _id: id }).exec();
  }


  async findOneByName(name: string): Promise<Service> {
    return (await this.serviceModel.findOne({ name: name }).exec());
  }

  async findOneByNameAndVersion(name: string, version: string): Promise<Service> {
    return (await this.serviceModel.findOne({ name, version }).exec());
  }

  async delete(id: Types.ObjectId) {
    const deletedCat = await this.serviceModel
      .findByIdAndDelete({ _id: id })
      .exec();
    return deletedCat;
  }

  async createServiceResponses(createdService: Service) {
    const paths = createdService.openapi['paths'];
    const creationPromises = [];

    // Iterate over all defined paths in the OpenAPI spec.
    for (const path in paths) {
      const methods = paths[path];
      for (const method in methods) {
        const operation = methods[method];

        // Generate a dynamic path by replacing any path parameters.
        const generatedPath = await MockerUtils.generatePath(
          path,
          Parameter.arrayFrom(operation.parameters, createdService.openapi),
          createdService.openapi
        );

        // For each response code defined in the operation.
        const responseCodes = Object.keys(operation.responses);
        const responsePromises = responseCodes.map(async (code) => {
          // Build the context for our example resolution rules.
          const context: ExampleResolutionContext = {
            responseDefinition: operation.responses[code],
            openapi: createdService.openapi,
            operation: operation
          };



          // Resolve the example(s) for the given response.
          const resolutionResult = await engine.resolve(context);
          console.log({operation, code,resolutionResult});
          
          // If a resolution result is returned, iterate over each example.
          if (resolutionResult && resolutionResult.examples.length > 0) {
            // For each example, create a separate response record.
            const recordPromises = resolutionResult.examples.map(async (example, index) => {
              const responseDto = {
                method,
                path: generatedPath,
                service: createdService._id,
                statusCode: Number.parseInt(code),
                content: example,
                // Save the example name if provided (e.g. from the MultipleExamplesRule)
                exampleName: resolutionResult.exampleNames ? resolutionResult.exampleNames[index] : null
              } as CreateResponseDto;
              return this.responseService.create(responseDto);
            });
            return Promise.all(recordPromises);
          } else {
            // Fallback: if no resolution result is available, create a response with an empty object.
            const fallbackDto = {
              method,
              path: generatedPath,
              service: createdService._id,
              statusCode: Number.parseInt(code),
              content: {},
              exampleName: 'aiGenerated'
            } as CreateResponseDto;
            return this.responseService.create(fallbackDto);
          }
        });
        creationPromises.push(Promise.all(responsePromises));
      }
    }
    await Promise.all(creationPromises);
  }

}