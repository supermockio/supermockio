import { Service } from "src/schemas/service.schema";
import { createServiceDto } from "./createServiceDto";
import mongoose from "mongoose";

export class CreateResponseDto {
    statusCode: number;
    content: object;
    service: createServiceDto | Service | mongoose.Types.ObjectId;
    path: string;
    method: string;
    exampleName?: string;
}
