import { Module } from "@nestjs/common"
import { JwtModule } from "@nestjs/jwt"
import { MongooseModule } from "@nestjs/mongoose"
import { PassportModule } from "@nestjs/passport"
import { User, UserSchema } from "src/schemas/user.schema"
import { AuthController } from "./auth.controller"
import { AuthService } from "./auth.service"
import { JwtStrategy } from "./strategies/jwt.strategy"
import { LocalStrategy } from "./strategies/local.strategy"
import { ConfigService } from "src/config/config.service"
import { PasswordReset, PasswordResetSchema } from "src/schemas/password-reset.schema"
import { Token, TokenSchema } from "src/schemas/token.schema"
import { EmailService } from "src/email/email.service"

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "defaultsecret",
      signOptions: { expiresIn: "60m" }, // 60 minutes for access tokens
    }),
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Token.name, schema: TokenSchema },
      { name: PasswordReset.name, schema: PasswordResetSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [AuthService, LocalStrategy, JwtStrategy, ConfigService, EmailService],
  exports: [AuthService],
})
export class AuthModule {}

