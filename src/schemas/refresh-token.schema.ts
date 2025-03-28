import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ApiProperty } from "@nestjs/swagger"
import { type HydratedDocument, Types } from "mongoose"

export type RefreshTokenDocument = HydratedDocument<RefreshToken>

@Schema()
export class RefreshToken {
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
  revoked: boolean

  @ApiProperty()
  @Prop({ default: Date.now })
  createdAt: Date
}

export const RefreshTokenSchema = SchemaFactory.createForClass(RefreshToken)

