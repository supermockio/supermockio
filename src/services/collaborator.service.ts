import { Injectable, HttpException, HttpStatus } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import { Service } from "src/schemas/service.schema"
import { User } from "src/schemas/user.schema"

@Injectable()
export class CollaboratorService {
  constructor(
    @InjectModel(Service.name) private readonly serviceModel: Model<Service>,
    @InjectModel(User.name) private readonly userModel: Model<User>
  ) {}

  async getCollaborators(serviceId: Types.ObjectId) {
    const service = await this.serviceModel.findById(serviceId).populate("collaborators", ["username", "email"]).exec()

    if (!service) {
      throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
    }

    return service.collaborators
  }

  async addCollaborator(serviceId: Types.ObjectId, email: string) {
    // Find the user by email
    const user = await this.userModel.findOne({ email }).exec()
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND)
    }

    const service = await this.serviceModel.findById(serviceId).exec()
    if (!service) {
      throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
    }

    // Check if user is already a collaborator
    if (service.collaborators.some((collab) => collab.toString() === user._id.toString())) {
      throw new HttpException("User is already a collaborator", HttpStatus.CONFLICT)
    }

    // Check if user is the owner
    if (service.owner.toString() === user._id.toString()) {
      throw new HttpException("Owner cannot be added as a collaborator", HttpStatus.CONFLICT)
    }

    // Add user to collaborators
    service.collaborators.push(user._id)
    await service.save()

    return service
  }

  async removeCollaborator(serviceId: Types.ObjectId, email: string) {
    // Find the user by email
    const user = await this.userModel.findOne({ email }).exec()
    if (!user) {
      throw new HttpException("User not found", HttpStatus.NOT_FOUND)
    }

    const service = await this.serviceModel.findById(serviceId).exec()
    if (!service) {
      throw new HttpException("Service not found", HttpStatus.NOT_FOUND)
    }

    // Check if user is a collaborator
    const collaboratorIndex = service.collaborators.findIndex((collab) => collab.toString() === user._id.toString())

    if (collaboratorIndex === -1) {
      throw new HttpException("User is not a collaborator", HttpStatus.NOT_FOUND)
    }

    // Remove user from collaborators
    service.collaborators.splice(collaboratorIndex, 1)
    await service.save()

    return service
  }

  async isCollaborator(serviceId: Types.ObjectId, userId: string): Promise<boolean> {
    const service = await this.serviceModel.findById(serviceId).exec()
    if (!service) {
      return false
    }

    return service.collaborators.some((collab) => collab.toString() === userId)
  }

  async isOwner(serviceId: Types.ObjectId, userId: string): Promise<boolean> {
    const service = await this.serviceModel.findById(serviceId).exec()
    if (!service) {
      return false
    }

    return service.owner.toString() === userId
  }
}

