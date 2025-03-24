import { Injectable, ConflictException, UnauthorizedException } from "@nestjs/common"
import { JwtService } from "@nestjs/jwt"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import * as bcrypt from "bcrypt"
import { User, type UserDocument } from "src/schemas/user.schema"
import { JwtPayload, RegisterDto } from "src/dtos/auth.dto"

@Injectable()
export class AuthService {
  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{ access_token: string }> {
    const { username, email, password } = registerDto

    // Check if user already exists
    const existingUser = await this.userModel.findOne({
      $or: [{ email }, { username }],
    })

    if (existingUser) {
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

    // Generate JWT token
    return this.generateToken(newUser)
  }

  async validateUser(email: string, password: string): Promise<User> {
    const user = await this.userModel.findOne({ email })

    if (!user) {
      throw new UnauthorizedException("Invalid credentials")
    }

    const isPasswordValid = await bcrypt.compare(password, user.password)

    if (!isPasswordValid) {
      throw new UnauthorizedException("Invalid credentials")
    }

    return user
  }

  async login(user: User): Promise<{ access_token: string }> {
    return this.generateToken(user)
  }

  private generateToken(user: User): { access_token: string } {
    const payload: JwtPayload = {
      sub: user._id.toString(),
      username: user.username,
      email: user.email,
      roles: user.roles,
    }

    return {
      access_token: this.jwtService.sign(payload),
    }
  }
}

