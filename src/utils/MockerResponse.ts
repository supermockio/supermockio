import { ApiProperty } from "@nestjs/swagger"

export class MockerResponse {
  @ApiProperty()
  status: number

  @ApiProperty()
  message: string

  @ApiProperty({ required: false })
  data?: any

  @ApiProperty()
  timestamp: string

  @ApiProperty({ required: false })
  path?: string

  public constructor(status: number, message: any, data?: any) {
    this.status = status

    // If message is an object with a message property, extract it
    if (typeof message === "object" && message !== null && message.message) {
      this.data = message
      this.message = message.message
    } else {
      this.message = typeof message === "string" ? message : "Success"
      this.data = typeof message === "object" ? message : data
    }

    this.timestamp = new Date().toISOString()
  }
}

