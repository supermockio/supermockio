import { All, Controller, Headers, HttpException, HttpStatus, Param, Req, Res } from "@nestjs/common";
import { ApiExcludeController } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ResponseService } from "src/services/response.service";
import { ServiceService } from "src/services/service.service";

@ApiExcludeController()
@Controller("/api/mocks/:name/:version/*")
export class MockerController {
    constructor(
        private readonly responseService: ResponseService, 
        private readonly serviceService: ServiceService
    ) { }

    @All()
    async handleMocks(
        @Req() request: Request, 
        @Param() params: string[], 
        @Res() res: Response, 
        @Headers("X-SuperMockio-Status") hdrStatus: number,
        @Headers("X-SuperMockio-Example") exampleName?: string
    ) {
        const responseCriteria = {
            method: request.method.toLowerCase(),
            path: "/" + request.path.split("/").slice(5).join("/"),
            name: params['name'],
            version: params['version']
        };

        const service = await this.serviceService.findOneByNameAndVersion(responseCriteria.name, responseCriteria.version);
        if (!service) {
            throw new HttpException("The service cannot be found", HttpStatus.NOT_FOUND);
        }

        let fetchedRes = await this.responseService.findOneByServiceCriteria(
            service._id, responseCriteria.path, responseCriteria.method, hdrStatus, exampleName
        );

        // Check the new env var to decide behavior.
        const strictMode = process.env.MOCKER_STRICT_MODE === 'true';
        if (!fetchedRes) {
            if (strictMode) {
                const errorMessage = `The request endpoint is not defined in this service with the following criteria: statusCode = ${hdrStatus || 'N/A'}, exampleName = ${exampleName || 'N/A'}.`;
                throw new HttpException(errorMessage, HttpStatus.NOT_FOUND);
            } else {
                // Fallback: return a random response for the endpoint.
                fetchedRes = await this.responseService.findRandomResponseByEndpoint(
                    service._id, responseCriteria.path, responseCriteria.method
                );
                if (!fetchedRes) {
                    throw new HttpException("No response defined for this endpoint", HttpStatus.NOT_FOUND);
                }
            }
        }

        res.status(fetchedRes.statusCode).json(fetchedRes.content);
    }
}
