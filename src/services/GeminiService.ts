import { GoogleGenerativeAI, type GenerativeModel } from "@google/generative-ai"
import { Injectable } from "@nestjs/common"
import { RateLimiter } from "limiter"
import { AIServiceInterface } from "src/utils/AIServiceInterface"
import { LoggingService } from "src/logging/logging.service"

export class GeminiService implements AIServiceInterface {
  private model: GenerativeModel
  private rateLimiter: RateLimiter
  private loggingService: LoggingService

  constructor() {
    this.loggingService = new LoggingService()
    this.loggingService.setContext("GeminiService")
  }

  public getModel() {
    try {
      if (!this.model) {
        const apiKey = process.env["AI_API_KEY"]
        const modelName = process.env["AI_MODEL_NAME"]
        if (!apiKey) {
          const error = "AI_API_KEY environment variable is not set"
          this.loggingService.error(error)
          throw new Error(error)
        }

        this.loggingService.debug("Initializing Gemini model")
        this.model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: modelName })
        this.loggingService.debug("Gemini model initialized successfully")
      }
      return this.model
    } catch (error) {
      this.loggingService.error(`Failed to initialize Gemini model: ${error.message}`, error.stack)
      throw error
    }
  }

  private getRateLimiter() {
    if (!this.rateLimiter) {
      const tokensPerInterval = Number.parseInt(process.env["AI_RATE_LIMIT_TOKENS"] || "15")
      const interval = "min"

      this.loggingService.debug(`Initializing rate limiter: ${tokensPerInterval} tokens per ${interval}`)
      this.rateLimiter = new RateLimiter({ tokensPerInterval, interval })
    }
    return this.rateLimiter
  }

  private cleanJson(response) {
    try {
      // Remove markdown annotations
      const cleanedResponse = response.replace(/```json|```/g, "")

      // Parse the cleaned JSON string
      const jsonData = cleanedResponse.includes("{") ? JSON.parse(cleanedResponse) : cleanedResponse

      return jsonData
    } catch (error) {
      this.loggingService.error(`Failed to clean JSON response: ${error.message}`, error.stack, null, {
        response: response.substring(0, 200) + (response.length > 200 ? "..." : ""),
      })

      // Return empty object as fallback
      return {}
    }
  }

  public async ask(prompt: string): Promise<any> {
    try {
      this.loggingService.debug("Requesting tokens from rate limiter")
      await this.getRateLimiter().removeTokens(1)

      this.loggingService.debug("Sending prompt to Gemini API", null, {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      })

      const result = await this.getModel().generateContent(prompt)

      if (!result || !result.response) {
        throw new Error("Empty response from Gemini API")
      }

      const response = result.response
      const responseText = response.text().trim()

      this.loggingService.debug("Received response from Gemini API", null, {
        responseLength: responseText.length,
        responsePreview: responseText.substring(0, 100) + (responseText.length > 100 ? "..." : ""),
      })

      const text = this.cleanJson(responseText)
      return text
    } catch (error) {
      this.loggingService.error(`AI generation failed: ${error.message}`, error.stack, null, {
        promptLength: prompt.length,
        promptPreview: prompt.substring(0, 100) + (prompt.length > 100 ? "..." : ""),
      })

      // Return empty object as fallback instead of throwing
      return {}
    }
  }
}

