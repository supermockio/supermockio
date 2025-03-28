import { Injectable } from "@nestjs/common"
import * as nodemailer from "nodemailer"
import { ConfigService } from "src/config/config.service"
import { LoggingService } from "src/logging/logging.service"

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter

  constructor(
    private configService: ConfigService,
    private loggingService: LoggingService,
  ) {
    this.loggingService.setContext("EmailService")
    this.initializeTransporter()
  }

  private initializeTransporter() {
    try {
      // Create a transporter using SMTP configuration
      this.transporter = nodemailer.createTransport({
        host: this.configService.get("SMTP_HOST"),
        port: Number.parseInt(this.configService.get("SMTP_PORT") || "587", 10),
        secure: this.configService.get("SMTP_SECURE") === "true",
        auth: {
          user: this.configService.get("SMTP_USER"),
          pass: this.configService.get("SMTP_PASSWORD"),
        },
      })

      this.loggingService.debug("Email transporter initialized")
    } catch (error) {
      this.loggingService.error(`Failed to initialize email transporter: ${error.message}`, error.stack)
    }
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<boolean> {
    try {
      const appUrl = this.configService.get("APP_URL") || "http://localhost:3000"
      const resetLink = `${appUrl}/reset-password?token=${token}`

      const mailOptions = {
        from: this.configService.get("SMTP_FROM") || "noreply@supermockio.io",
        to: email,
        subject: "Password Reset Request",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your SuperMockio account.</p>
            <p>Please click the link below to reset your password:</p>
            <p>
              <a href="${resetLink}" style="display: inline-block; padding: 10px 20px; background-color: #4F46E5; color: white; text-decoration: none; border-radius: 4px;">
                Reset Password
              </a>
            </p>
            <p>This link will expire in 1 hour.</p>
            <p>If you did not request a password reset, please ignore this email.</p>
            <p>Thank you,<br>The SuperMockio Team</p>
          </div>
        `,
      }

      const info = await this.transporter.sendMail(mailOptions)

      this.loggingService.log(`Password reset email sent to ${email}`, null, {
        messageId: info.messageId,
      })

      return true
    } catch (error) {
      this.loggingService.error(`Failed to send password reset email to ${email}: ${error.message}`, error.stack)
      return false
    }
  }
}

