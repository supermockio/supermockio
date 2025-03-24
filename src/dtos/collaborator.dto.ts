import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty } from "class-validator"

export class AddCollaboratorDto {
  @ApiProperty({ example: "john@example.com", description: "Email of the user to add as collaborator" })
  @IsEmail()
  @IsNotEmpty()
  email: string
}

export class RemoveCollaboratorDto {
  @ApiProperty({ example: "john@example.com", description: "Email of the collaborator to remove" })
  @IsEmail()
  @IsNotEmpty()
  email: string
}

