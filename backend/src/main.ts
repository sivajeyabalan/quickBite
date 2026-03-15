// src/main.ts
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { GlobalExceptionFilter } from './common/filters/Global-exception.filters';
import { LoggingInterceptor } from './common/Interceptors/Logging.interceptors';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.use(cookieParser());
  app.setGlobalPrefix('api');

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  app.enableCors({
    origin: 'http://localhost:5173',
    credentials: true,
  });

   app.useGlobalFilters(new GlobalExceptionFilter());
   app.useGlobalInterceptors(new LoggingInterceptor());


  // ─── Swagger ────────────────────────────────────────────────────
  const config = new DocumentBuilder()
    .setTitle('QuickBite API')
    .setDescription('Restaurant ordering system REST API')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'access-token',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
  // ────────────────────────────────────────────────────────────────

  await app.listen(process.env.PORT ?? 3001);
  console.log(`🚀 Server running on http://localhost:3001/api`);
  console.log(`📖 Swagger docs at  http://localhost:3001/docs`);
}
bootstrap();