import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ApiProperty } from "@nestjs/swagger"
import { type HydratedDocument, Types } from "mongoose"

export type PasswordResetDocument = HydratedDocument<PasswordReset>

@Schema()
export class PasswordReset {
  _id: Types.ObjectId

  @ApiProperty()
  @Prop({ required: true })
  token: string

  @ApiProperty()
  @Prop({ required: true, type: Types.ObjectId, ref: "User" })
  userId: Types.ObjectId

  @ApiProperty()
  @Prop({ required: true })
  expiresAt: Date

  @ApiProperty()
  @Prop({ default: false })
  used: boolean

  @ApiProperty()
  @Prop({ default: Date.now })
  createdAt: Date
}

export const PasswordResetSchema = SchemaFactory.createForClass(PasswordReset)

