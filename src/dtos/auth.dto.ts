import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, MinLength } from "class-validator"

export class RegisterDto {
  @ApiProperty({ example: "johndoe" })
  @IsString()
  @IsNotEmpty()
  username: string

  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: "Password123!" })
  @IsString()
  @MinLength(8)
  password: string
}

export class LoginDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string

  @ApiProperty({ example: "Password123!" })
  @IsString()
  @IsNotEmpty()
  password: string
}

export class JwtPayload {
  sub: string
  username: string
  email: string
  roles: string[]
}

