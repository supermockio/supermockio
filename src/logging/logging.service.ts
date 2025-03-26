import { Injectable, type LoggerService } from "@nestjs/common"
import * as fs from "fs"
import * as path from "path"
import * as winston from "winston"
import "winston-daily-rotate-file"

@Injectable()
export class LoggingService implements LoggerService {
  private logger: winston.Logger
  private contextName = "Application"

  constructor() {
    // Create logs directory if it doesn't exist
    const logDir = path.join(process.cwd(), "logs")
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir)
    }

    // Get log levels from environment variables or use defaults
    const consoleLogLevel = process.env.LOG_LEVEL_CONSOLE || (process.env.NODE_ENV === "production" ? "info" : "debug")
    const fileLogLevel = process.env.LOG_LEVEL_FILE || "info"
    const errorLogLevel = process.env.LOG_LEVEL_ERROR || "error"
    const accessLogLevel = process.env.LOG_LEVEL_ACCESS || "http"

    // Define log formats
    const consoleFormat = winston.format.combine(
      winston.format.timestamp(),
      winston.format.colorize(),
      winston.format.printf(({ timestamp, level, message, context, trace, ...meta }) => {
        return `${timestamp} [${context || this.contextName}] ${level}: ${message}${
          Object.keys(meta).length ? " " + JSON.stringify(meta) : ""
        }${trace ? `\n${trace}` : ""}`
      }),
    )

    const fileFormat = winston.format.combine(winston.format.timestamp(), winston.format.json())

    // Create transports
    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: consoleFormat,
        level: consoleLogLevel,
      }),
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, "application-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE || "20m",
        maxFiles: process.env.LOG_MAX_FILES || "14d",
        format: fileFormat,
        level: fileLogLevel,
      }),
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, "error-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE || "20m",
        maxFiles: process.env.LOG_MAX_FILES || "14d",
        format: fileFormat,
        level: errorLogLevel,
      }),
      new winston.transports.DailyRotateFile({
        filename: path.join(logDir, "access-%DATE%.log"),
        datePattern: "YYYY-MM-DD",
        zippedArchive: true,
        maxSize: process.env.LOG_MAX_SIZE || "20m",
        maxFiles: process.env.LOG_MAX_FILES || "14d",
        format: fileFormat,
        level: accessLogLevel,
      }),
    ]

    // Create logger
    this.logger = winston.createLogger({
      levels: winston.config.npm.levels,
      transports,
    })

    // Log the configured log levels
    this.logger.info("Logging service initialized", {
      consoleLogLevel,
      fileLogLevel,
      errorLogLevel,
      accessLogLevel,
    })
  }

  setContext(context: string) {
    this.contextName = context
    return this
  }

  log(message: any, context?: string, ...optionalParams: any[]) {
    this.logger.info(message, { context: context || this.contextName, ...this.extractMetadata(optionalParams) })
  }

  error(message: any, trace?: string, context?: string, ...optionalParams: any[]) {
    this.logger.error(message, {
      context: context || this.contextName,
      trace,
      ...this.extractMetadata(optionalParams),
    })
  }

  warn(message: any, context?: string, ...optionalParams: any[]) {
    this.logger.warn(message, { context: context || this.contextName, ...this.extractMetadata(optionalParams) })
  }

  debug(message: any, context?: string, ...optionalParams: any[]) {
    this.logger.debug(message, { context: context || this.contextName, ...this.extractMetadata(optionalParams) })
  }

  verbose(message: any, context?: string, ...optionalParams: any[]) {
    this.logger.verbose(message, { context: context || this.contextName, ...this.extractMetadata(optionalParams) })
  }

  // Special method for access logs
  access(req: any, res: any, responseTime: number) {
    const { ip, method, originalUrl } = req
    const userAgent = req.get("user-agent") || ""
    const { statusCode } = res

    this.logger.log("http", "Access Log", {
      context: "AccessLog",
      ip,
      method,
      url: originalUrl,
      statusCode,
      responseTime: `${responseTime}ms`,
      userAgent
    })
  }

  private extractMetadata(params: any[]) {
    if (params.length === 0) return {}

    // If the first parameter is an object, use it as metadata
    if (typeof params[0] === "object" && params[0] !== null) {
      return params[0]
    }

    return {}
  }
}

