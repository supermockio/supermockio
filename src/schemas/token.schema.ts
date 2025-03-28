import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import { ApiProperty } from "@nestjs/swagger"
import { type HydratedDocument, Types } from "mongoose"

export type TokenDocument = HydratedDocument<Token>

@Schema()
export class Token {
  _id: Types.ObjectId

  @ApiProperty()
  @Prop({ required: true, type: Types.ObjectId, ref: "User" })
  userId: Types.ObjectId

  @ApiProperty()
  @Prop({ required: true })
  accessToken: string

  @ApiProperty()
  @Prop({ required: true })
  refreshToken: string

  @ApiProperty()
  @Prop({ required: true })
  accessTokenExpiresAt: Date

  @ApiProperty()
  @Prop({ required: true })
  refreshTokenExpiresAt: Date

  @ApiProperty()
  @Prop({ default: false })
  revoked: boolean

  @ApiProperty()
  @Prop({ default: Date.now })
  createdAt: Date
}

export const TokenSchema = SchemaFactory.createForClass(Token)

