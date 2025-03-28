import { ApiProperty } from "@nestjs/swagger"
import { IsEmail, IsNotEmpty, IsString, MinLength, Matches } from "class-validator"

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

export class RefreshTokenDto {
  @ApiProperty({ example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." })
  @IsString()
  @IsNotEmpty()
  refreshToken: string
}

export class TokensResponseDto {
  @ApiProperty()
  access_token: string

  @ApiProperty()
  refresh_token: string

  @ApiProperty()
  expires_in: number
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "john@example.com" })
  @IsEmail()
  @IsNotEmpty()
  email: string
}

export class ResetPasswordDto {
  @ApiProperty({ example: "5f4dcc3b5aa765d61d8327deb882cf99" })
  @IsString()
  @IsNotEmpty()
  token: string

  @ApiProperty({ example: "NewPassword123!" })
  @IsString()
  @MinLength(8)
  @Matches(/((?=.*\d)|(?=.*\W+))(?![.\n])(?=.*[A-Z])(?=.*[a-z]).*$/, {
    message: "Password must contain at least 1 uppercase letter, 1 lowercase letter, and 1 number or special character",
  })
  password: string
}

export class JwtPayload {
  sub: string
  username: string
  email: string
  roles: string[]
}

