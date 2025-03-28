import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { InjectModel } from "@nestjs/mongoose"
import { Model, Types } from "mongoose"
import * as bcrypt from "bcrypt"
import { User, UserDocument } from "src/schemas/user.schema"
import { JwtPayload, LoginDto, RegisterDto, TokensResponseDto } from "src/dtos/auth.dto"
import { LoggingService } from "src/logging/logging.service"
import { PasswordReset, PasswordResetDocument } from "src/schemas/password-reset.schema"
import { Token, TokenDocument } from "src/schemas/token.schema"
import * as crypto from "crypto"
import { EmailService } from "src/email/email.service"

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(Token.name) private tokenModel: Model<TokenDocument>,
    @InjectModel(PasswordReset.name) private passwordResetModel: Model<PasswordResetDocument>,
    private jwtService: JwtService,
    private loggingService: LoggingService,
    private emailService: EmailService
  ) {
    this.loggingService.setContext('AuthService');
  }

  async register(registerDto: RegisterDto): Promise<TokensResponseDto> {
    const { username, email, password } = registerDto

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
      this.loggingService.warn(`Registration failed: User with email ${email} or username ${username} already exists`)
      throw new ConflictException("User with this email or username already exists")
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await this.userModel.create({
      username,
      email,
      password: hashedPassword,
      roles: ["user"],
    })

    this.loggingService.log(`User registered successfully: ${username} (${email})`, null, {
      userId: newUser._id.toString(),
    })

    // Generate tokens for new user
    return this.generateTokens(newUser)
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({ email })

    if (!user) {
      this.loggingService.warn(`Login failed: User with email ${email} not found`)
      throw new UnauthorizedException("Invalid credentials")
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      this.loggingService.warn(`Login failed: Invalid password for user ${email}`, null, {
        userId: user._id.toString(),
      })
      throw new UnauthorizedException("Invalid credentials")
    }

    return user
  }

  async login(userDto: LoginDto): Promise<TokensResponseDto> {
    try {

      // Get User
      const user = await this.validateUser(userDto.email, userDto.password)
      
      // Check if user has valid tokens already
      const existingToken = await this.tokenModel.findOne({
        userId: user._id,
        revoked: false,
        accessTokenExpiresAt: { $gt: new Date() },
        refreshTokenExpiresAt: { $gt: new Date() },
      })

      // If valid tokens exist, return them
      if (existingToken) {
        this.loggingService.debug(`Reusing existing tokens for user login`, null, {
          userId: user._id.toString(),
          username: user.username,
        })

        // Calculate remaining time for access token
        const expiresIn = Math.floor((existingToken.accessTokenExpiresAt.getTime() - Date.now()) / 1000)

        return {
          access_token: existingToken.accessToken,
          refresh_token: existingToken.refreshToken,
          expires_in: expiresIn,
        }
      }

      // No valid tokens, generate new ones
      return this.generateTokens(user)
    } catch (error) {
      this.loggingService.error(`Login error: ${error.message}`, error.stack)
      throw new UnauthorizedException("Login failed")
    }
  }

  async refreshTokens(refreshToken: string): Promise<TokensResponseDto> {
    try {
      // Find the token in the database
      const storedToken = await this.tokenModel.findOne({
        refreshToken,
        revoked: false,
        refreshTokenExpiresAt: { $gt: new Date() },
      })

      if (!storedToken) {
        this.loggingService.warn(`Token refresh failed: Invalid or expired refresh token`)
        throw new UnauthorizedException("Invalid or expired refresh token")
      }

      // Get the user
      const user = await this.userModel.findById(storedToken.userId)
      if (!user) {
        this.loggingService.warn(`Token refresh failed: User not found for token`)
        throw new UnauthorizedException("User not found")
      }

      // Revoke the current token
      await this.tokenModel.findByIdAndUpdate(storedToken._id, { revoked: true })

      // Generate new tokens
      return this.generateTokens(user)
    } catch (error) {
      this.loggingService.error(`Token refresh error: ${error.message}`, error.stack)
      throw new UnauthorizedException("Failed to refresh token")
    }
  }

  async logout(userId: string): Promise<void> {
    try {
      // Revoke all tokens for the user
      await this.tokenModel.updateMany({ userId: new Types.ObjectId(userId), revoked: false }, { revoked: true })

      this.loggingService.log(`User logged out successfully`, null, { userId })
    } catch (error) {
      this.loggingService.error(`Logout error: ${error.message}`, error.stack)
      throw new BadRequestException("Failed to logout")
    }
  }

  async forgotPassword(email: string): Promise<void> {
    try {
      // Find user by email
      const user = await this.userModel.findOne({ email })

      // If no user found, log but don't throw error (security best practice)
      if (!user) {
        this.loggingService.debug(`Password reset requested for non-existent email: ${email}`)
        return // Return silently to prevent email enumeration
      }

      // Generate a password reset token
      const token = crypto.randomBytes(32).toString("hex")
      const expiresAt = new Date()
      expiresAt.setHours(expiresAt.getHours() + 1) // Token valid for 1 hour

      // Save token to database
      await this.passwordResetModel.create({
        token,
        userId: user._id,
        expiresAt,
        used: false,
      })

      this.loggingService.log(`Password reset token generated for user: ${email}`, null, {
        userId: user._id.toString(),
      })

      // Send the password reset email
      const emailSent = await this.emailService.sendPasswordResetEmail(user.email, token)

      if (!emailSent) {
        this.loggingService.warn(`Failed to send password reset email to ${email}`, null, {
          userId: user._id.toString(),
        })
      }

      // In a real application, you would send an email here
      // For this implementation, we'll just log the token
      this.loggingService.debug(`[MOCK EMAIL] Password reset link: /reset-password?token=${token}`)

      // Note: In production, you would use a real email service like:
      // await this.emailService.sendPasswordResetEmail(user.email, token);
    } catch (error) {
      this.loggingService.error(`Error in forgot password: ${error.message}`, error.stack)
      throw new BadRequestException("Failed to process password reset request")
    }
  }

  async resetPassword(token: string, newPassword: string): Promise<void> {
    try {
      // Find valid token
      const passwordReset = await this.passwordResetModel.findOne({
        token,
        used: false,
        expiresAt: { $gt: new Date() },
      })

      if (!passwordReset) {
        this.loggingService.warn(`Invalid or expired password reset token used: ${token}`)
        throw new BadRequestException("Invalid or expired password reset token")
      }

      // Find user
      const user = await this.userModel.findById(passwordReset.userId)
      if (!user) {
        this.loggingService.warn(`User not found for password reset token: ${token}`)
        throw new NotFoundException("User not found")
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(newPassword, 10)

      // Update user's password
      await this.userModel.findByIdAndUpdate(user._id, { password: hashedPassword })

      // Mark token as used
      await this.passwordResetModel.findByIdAndUpdate(passwordReset._id, { used: true })

      // Revoke all tokens for this user (force re-login with new password)
      await this.tokenModel.updateMany({ userId: user._id, revoked: false }, { revoked: true })

      this.loggingService.log(`Password reset successful for user`, null, {
        userId: user._id.toString(),
        email: user.email,
      })
    } catch (error) {
      this.loggingService.error(`Error in reset password: ${error.message}`, error.stack)
      throw new BadRequestException("Failed to reset password")
    }
  }

  private async generateTokens(user: User): Promise<TokensResponseDto> {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      roles: user.roles,
    }

    // Generate access token
    const accessToken = this.jwtService.sign(payload)

    // Get token expiration time (in seconds)
    const decodedToken = this.jwtService.decode(accessToken) as { exp: number }
    const expiresIn = decodedToken.exp - Math.floor(Date.now() / 1000)

    // Calculate expiration dates
    const accessTokenExpiresAt = new Date(Date.now() + expiresIn * 1000)
    const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days

    // Generate refresh token
    const refreshToken = crypto.randomBytes(40).toString("hex")

    // Store both tokens in database
    await this.tokenModel.create({
      userId: user._id,
      accessToken,
      refreshToken,
      accessTokenExpiresAt,
      refreshTokenExpiresAt,
      revoked: false,
    })

    this.loggingService.debug(`Generated new tokens for user`, null, {
      userId: user._id.toString(),
      username: user.username,
    })

    return {
      access_token: accessToken,
      refresh_token: refreshToken,
      expires_in: expiresIn,
    }
  }
}

