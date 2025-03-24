import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ApiProperty } from "@nestjs/swagger"
import mongoose, { type HydratedDocument, Types } from "mongoose"
import { User } from "./user.schema"

export type ServiceDocument = HydratedDocument<Service>

@Schema()
export class Service {
  _id: Types.ObjectId

  @ApiProperty()
  @Prop()
  name: string

  @ApiProperty()
  @Prop()
  version: string

  @ApiProperty()
  @Prop()
  description: string

  @ApiProperty()
  @Prop({ type: "object" })
  openapi: object

  @ApiProperty({ description: "The user who owns this service" })
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: "User", required: true })
  owner: User | Types.ObjectId

  @ApiProperty({ description: "Users who can view this service" })
  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }], default: [] })
  collaborators: (Types.ObjectId)[]

  constructor(id, name, version, description, openapi) {
    this._id = id
    this.name = name
    this.openapi = openapi
    this.version = version
    this.description = description
  }
}

export const ServiceSchema = SchemaFactory.createForClass(Service)

