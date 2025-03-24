import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ApiProperty } from "@nestjs/swagger"
import { HydratedDocument, Types } from "mongoose"

export type UserDocument = HydratedDocument<User>

@Schema()
export class User {
  _id: Types.ObjectId

  @ApiProperty()
  @Prop({ required: true, unique: true })
  username: string

  @ApiProperty()
  @Prop({ required: true, unique: true })
  email: string

  @ApiProperty()
  @Prop({ required: true })
  password: string

  @ApiProperty()
  @Prop({ default: ["user"] })
  roles: string[]

  @ApiProperty()
  @Prop({ default: Date.now })
  createdAt: Date
}

export const UserSchema = SchemaFactory.createForClass(User)

