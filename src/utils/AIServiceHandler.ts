import { Injectable } from "@nestjs/common"
import { GeminiService } from "src/services/GeminiService"
import { AIServiceInterface } from "./AIServiceInterface"
import { LoggingService } from "src/logging/logging.service"

@Injectable()
export class AIServiceHandler {
  private static loggingService: LoggingService

  constructor(loggingService: LoggingService) {
    AIServiceHandler.loggingService = loggingService
    AIServiceHandler.loggingService.setContext("AIServiceHandler")
  }

  public static getAIService(): AIServiceInterface {
    try {
      const name = process.env["AI_SERVICE_NAME"]

      if (this.loggingService) {
        this.loggingService.debug(`Getting AI service: ${name}`)
      }

      switch (name) {
        case "gemini":
          if (this.loggingService) {
            this.loggingService.debug("Using Gemini AI service")
          }
          return new GeminiService(this.loggingService)
        default:
          const error = "Please set AI_SERVICE_NAME environment variable to select an AI service to use"
          if (this.loggingService) {
            this.loggingService.error(error)
          }
          throw new Error(error)
      }
    } catch (error) {
      if (this.loggingService) {
        this.loggingService.error(`Failed to get AI service: ${error.message}`, error.stack)
      }
      throw error
    }
  }
}

