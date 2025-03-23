import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { CreateResponseDto } from 'src/dtos/createResponseDto';
import { Response } from 'src/schemas/response.schema';



@Injectable()
export class ResponseService {
  constructor(@InjectModel(Response.name) private readonly responseModel: Model<Response>) {}

  async create(createResponseDto: CreateResponseDto): Promise<Response> {
    const createdResponse = await this.responseModel.create(createResponseDto);
    return createdResponse;
  }

  async findAll(): Promise<Response[]> {
    return this.responseModel.find().exec();
  }

  async findOne(id: string): Promise<Response> {
    return this.responseModel.findOne({ _id: id }).populate('service', ["name"]).exec();
  }

  async findOneByNamePopulated(name: number): Promise<Response> {
    return (await this.responseModel.findOne({ statusCode: name }).populate("service").exec());
  }

  async findOneByServiceCriteria(
    serviceId: Types.ObjectId, 
    path: string, 
    method: string, 
    statusCode?: number, 
    exampleName?: string
  ): Promise<Response> {
    const query: any = { service: serviceId, path, method };
    if (statusCode) {
      query.statusCode = statusCode;
    }
    if (exampleName) {
      query.exampleName = exampleName;
    }
    return await this.responseModel.findOne(query).exec();
  }

  async findRandomResponseByEndpoint(
    serviceId: Types.ObjectId, 
    path: string, 
    method: string
  ): Promise<Response> {
    const responses = await this.responseModel.find({ service: serviceId, path, method }).exec();
    if (!responses || responses.length === 0) {
      return null;
    }
    const randomIndex = Math.floor(Math.random() * responses.length);
    return responses[randomIndex];
  }
  
  

  async findOneByService(serviceId: Types.ObjectId, path: string, method: string, statusCode: number): Promise<Response> {
    const query = { service: serviceId, path, method };
    
    if (statusCode) {
      query['statusCode'] = statusCode;
    }
    return (await this.responseModel.findOne(query).exec());
  }

  async findByService(serviceId: Types.ObjectId): Promise<Response[]> {
    return (await this.responseModel.find({ service: serviceId }).exec());
  }

  async delete(id: string) {
    const deletedCat = await this.responseModel
      .findByIdAndDelete({ _id: id })
      .exec();
    return deletedCat;
  }

  async deleteByService(serviceId: Types.ObjectId){
    const responses = await this.responseModel.find({ service: serviceId})
    responses.forEach( async res => {
      await this.responseModel.findByIdAndDelete(res._id)
    })
    return responses
  }

}