import { Injectable, UnauthorizedException } from "@nestjs/common"
import { PassportStrategy } from "@nestjs/passport"
import { ExtractJwt, Strategy } from "passport-jwt"
import { ConfigService } from "src/config/config.service"
import { JwtPayload } from "src/dtos/auth.dto"
import { InjectModel } from "@nestjs/mongoose"
import { Model } from "mongoose"
import { Token } from "src/schemas/token.schema"
import { LoggingService } from "src/logging/logging.service"

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    @InjectModel(Token.name) private tokenModel: Model<Token>,
    private loggingService: LoggingService
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: process.env.JWT_SECRET || "defaultsecret",
      passReqToCallback: true,
    })
    this.loggingService.setContext('JwtStrategy');
  }

  async validate(req: any, payload: JwtPayload) {
    try {
      // Extract token from authorization header
      const authHeader = req.headers.authorization
      const token = authHeader?.split(" ")[1]

      if (!token) {
        throw new UnauthorizedException("Invalid token")
      }

      // Check if token exists in database and is not revoked
      const tokenRecord = await this.tokenModel.findOne({
        accessToken: token,
        revoked: false,
        accessTokenExpiresAt: { $gt: new Date() },
      })

      if (!tokenRecord) {
        this.loggingService.warn(`Token validation failed: Token not found in database or revoked`, null, {
          userId: payload.sub,
        })
        throw new UnauthorizedException("Invalid token")
      }

      return {
        userId: payload.sub,
        username: payload.username,
        email: payload.email,
        roles: payload.roles,
      }
    } catch (error) {
      this.loggingService.error(`JWT validation error: ${error.message}`, error.stack)
      throw new UnauthorizedException("Authentication failed")
    }
  }
}

