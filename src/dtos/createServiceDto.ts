import { Types } from "mongoose"

export class createServiceDto {
  name: string
  version: string
  description: string
  openapi: any
  owner: Types.ObjectId | string
  collaborators?: (Types.ObjectId | string)[]
}

