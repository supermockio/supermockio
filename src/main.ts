import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { exit } from 'process';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';


async function bootstrap() {
  if (!process.env['MONGO_PASSWORD'] || !process.env['MONGO_USER'] || !process.env['MONGO_HOST'] || !process.env['MONGO_DATABASE']) {
    console.error("You need to set the required environment variables");
    console.error(`- MONGO_USER
- MONGO_HOST
- MONGO_PASSWORD
- MONGO_DATABASE
- AI_GENERATION_ENABLED`);
    exit(1)
    
  }
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: '*'
  });


  
  const config = new DocumentBuilder()
  .setTitle('SuperMockio')
  .setDescription(`SuperMockio is a powerful tool designed to accelerate API development by generating mock backends directly from OpenAPI specifications. 
   \n Whether you're an API designer, frontend or backend developer, or project manager. 
   \n SuperMockio empowers you to create realistic mock APIs for various use cases, such as client demos, decoupling frontend and backend development, or testing API integrations`)
  .setVersion('1.0.0')
  .addTag('services')
  .addServer('http://supermockio.io')
  .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-doc', app, document, {
    yamlDocumentUrl: "swagger/yaml"
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
