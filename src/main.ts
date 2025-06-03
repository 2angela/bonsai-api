import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors()

  app.setGlobalPrefix('api');

  const config = new DocumentBuilder()
    .setTitle('Bons_AI Service API')
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('api/docs', app, documentFactory);

  await app.listen(8080);

  console.log('Server running on http://localhost:8080');
  console.log('Server running on Swagger http://localhost:8080/api/docs');
}
bootstrap();
