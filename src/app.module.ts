import { Module, type MiddlewareConsumer, type NestModule } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { ConfigService } from "./config/config.service"
import { ConfigModule } from "./config/config.module"
import { Service, ServiceSchema } from "./schemas/service.schema"
import { ServiceService } from "./services/service.service"
import { ResponseService } from "./services/response.service"
import { Response, ResponseSchema } from "./schemas/response.schema"
import { ServiceController } from "./controllers/service.controller"
import { MockerController } from "./controllers/mocker.controller"
import { GeminiService } from "./services/GeminiService"
import { AuthModule } from "./auth/auth.module"
import { User, UserSchema } from "./schemas/user.schema"
import { CollaboratorService } from "./services/collaborator.service"
import { CollaboratorController } from "./controllers/collaborator.controller"
import { ServicePermissionGuard } from "./auth/guards/service-permission.guard"
import { LoggingModule } from "./logging/logging.module"
import { LoggingMiddleware } from "./logging/logging.middleware"

@Module({
  imports: [
    ConfigModule,
    LoggingModule,
    // MongoDB Connection Config
    MongooseModule.forRoot(new ConfigService().getMongoConfig()),
    // Service Schema DB config
    MongooseModule.forFeature([{ name: Service.name, schema: ServiceSchema }]),
    // Response Schema DB config
    MongooseModule.forFeature([{ name: Response.name, schema: ResponseSchema }]),
    // User Schema DB config
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    // Auth Module
    AuthModule,
  ],
  controllers: [ServiceController, MockerController, CollaboratorController],
  providers: [ServiceService, ResponseService, GeminiService, CollaboratorService, ServicePermissionGuard],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggingMiddleware).forRoutes("*")
  }
}

