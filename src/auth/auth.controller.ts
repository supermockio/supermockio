import { Body, Controller, Post, UseGuards, Request, HttpCode, Get } from "@nestjs/common"
import { ApiTags, ApiOperation, ApiResponse } from "@nestjs/swagger"
import {
  type LoginDto,
  type RefreshTokenDto,
  type RegisterDto,
  TokensResponseDto,
  type ForgotPasswordDto,
  type ResetPasswordDto,
} from "src/dtos/auth.dto"
import { AuthService } from "./auth.service"
import { LocalAuthGuard } from "./guards/local-auth.guard"
import { JwtAuthGuard } from "./guards/jwt-auth.guard"
import { User } from "src/schemas/user.schema"


@ApiTags("auth")
@Controller("api/auth")
export class AuthController {
  constructor(private authService: AuthService) {}


  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get current user information' })
  @ApiResponse({ 
    status: 200, 
    description: 'Returns current user information',
    type: User
  })
  @ApiResponse({ 
    status: 401, 
    description: 'Unauthorized if token is invalid' 
  })
  async getCurrentUser(@Request() req): Promise<Partial<User>> {
    // Return basic user information (excluding sensitive data like password)
    return {
      username: req.user.username,
      email: req.user.email,
      createdAt: req.user.createdAt
    };
  }

  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiResponse({ status: 201, description: 'User successfully registered', type: TokensResponseDto })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async register(@Body() registerDto: RegisterDto): Promise<TokensResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post("login")
  @ApiOperation({ summary: "Login with email and password" })
  @ApiResponse({ status: 200, description: "User successfully logged in", type: TokensResponseDto })
  @ApiResponse({ status: 401, description: "Invalid credentials" })
  async login(@Request() req, @Body() loginDto: LoginDto): Promise<TokensResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post("refresh")
  @ApiOperation({ summary: "Refresh access token using refresh token" })
  @ApiResponse({ status: 200, description: "Tokens refreshed successfully", type: TokensResponseDto })
  @ApiResponse({ status: 401, description: "Invalid or expired refresh token" })
  @HttpCode(200)
  async refreshTokens(@Body() refreshTokenDto: RefreshTokenDto): Promise<TokensResponseDto> {
    return this.authService.refreshTokens(refreshTokenDto.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Post("logout")
  @ApiOperation({ summary: "Logout and invalidate refresh token" })
  @ApiResponse({ status: 200, description: "Successfully logged out" })
  @HttpCode(200)
  async logout(@Request() req): Promise<{ message: string }> {
    await this.authService.logout(req.user.userId);
    return { message: "Successfully logged out" };
  }

  @Post("forgot-password")
  @ApiOperation({ summary: "Request a password reset" })
  @ApiResponse({ status: 200, description: "Password reset email sent" })
  @HttpCode(200)
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(forgotPasswordDto.email);
    return { message: "If your email is registered, you will receive password reset instructions" };
  }

  @Post("reset-password")
  @ApiOperation({ summary: "Reset password using token" })
  @ApiResponse({ status: 200, description: "Password successfully reset" })
  @ApiResponse({ status: 400, description: "Invalid or expired token" })
  @HttpCode(200)
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.password);
    return { message: "Password has been successfully reset" };
  }
}

