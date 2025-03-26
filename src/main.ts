import { NestFactory } from "@nestjs/core"
import { AppModule } from "./app.module"
import { exit } from "process"
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger"
import { NestExpressApplication } from "@nestjs/platform-express"
import { HttpExceptionFilter } from "./filters/http-exception.filter"
import { ResponseInterceptor } from "./interceptors/response.interceptor"
import { ValidationPipe } from "@nestjs/common"
import { LoggingService } from "./logging/logging.service"

async function bootstrap() {
  if (
    !process.env["MONGO_PASSWORD"] ||
    !process.env["MONGO_USER"] ||
    !process.env["MONGO_HOST"] ||
    !process.env["MONGO_DATABASE"]
  ) {
    console.error("You need to set the required environment variables")
    console.error(`- MONGO_USER
- MONGO_HOST
- MONGO_PASSWORD
- MONGO_DATABASE
- AI_GENERATION_ENABLED`)
    exit(1)
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    bufferLogs: true,
  })

  // Get the logging service from the app container
  const loggingService = app.get(LoggingService)

  app.useLogger(loggingService)

  loggingService.log("Application starting up", "Bootstrap")

  app.enableCors({
    origin: "*",
  })

  // Apply global pipes, filters, and interceptors
  app.useGlobalPipes(new ValidationPipe({ transform: true }))
  app.useGlobalFilters(new HttpExceptionFilter(loggingService))
  app.useGlobalInterceptors(new ResponseInterceptor())

  const config = new DocumentBuilder()
    .setTitle("SuperMockio")
    .setDescription(`SuperMockio is a powerful tool designed to accelerate API development by generating mock backends directly from OpenAPI specifications. 
   \n Whether you're an API designer, frontend or backend developer, or project manager. 
   \n SuperMockio empowers you to create realistic mock APIs for various use cases, such as client demos, decoupling frontend and backend development, or testing API integrations`)
    .setVersion("1.0.0")
    .addTag("services")
    .addServer("http://supermockio.io")
    .build()
  const document = SwaggerModule.createDocument(app, config)
  SwaggerModule.setup("api-doc", app, document, {
    yamlDocumentUrl: "swagger/yaml",
  })

  const port = process.env.PORT || 3000
  await app.listen(port)
  loggingService.log(`Application started on port ${port}`, "Bootstrap")
}
bootstrap()

