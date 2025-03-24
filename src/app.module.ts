import { Module } from "@nestjs/common"
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

@Module({
  imports: [
    ConfigModule,
    // MongoDB Connection Config
    MongooseModule.forRoot(new ConfigService().getMongoConfig()),
    // Service Schema DB config
    MongooseModule.forFeature([{ name: Service.name, schema: ServiceSchema }]),
    // Response Schema DB config
    MongooseModule.forFeature([{ name: Response.name, schema: ResponseSchema }]),
    // Auth Module
    AuthModule,
  ],
  controllers: [ServiceController, MockerController],
  providers: [ServiceService, ResponseService, GeminiService],
})
export class AppModule {}

