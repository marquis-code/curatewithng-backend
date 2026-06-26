import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { WinstonLoggerService } from './config/logger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: new WinstonLoggerService(),
  });

  // Security & Cookies
  app.use(helmet());
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: true, // Reflects the request origin, which solves CORS for all localhost ports
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  });

  // Global pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Global filters & interceptors
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new TransformInterceptor());

  // Swagger API docs
  const config = new DocumentBuilder()
    .setTitle('CurateWithNG API')
    .setDescription('AI-powered gifting curation platform for Nigeria')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication & authorization')
    .addTag('Users', 'User management')
    .addTag('Vendors', 'Vendor profiles & onboarding')
    .addTag('Gifts', 'Gift products & catalogue')
    .addTag('AI Curator', 'AI-powered gift curation')
    .addTag('Orders', 'Order management')
    .addTag('Payments', 'Paystack & Stripe payments')
    .addTag('Media', 'File uploads & Cloudinary')
    .addTag('Notifications', 'Email, SMS & in-app notifications')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 CurateWithNG API running on http://localhost:${port}`);
  console.log(`📚 Swagger docs at http://localhost:${port}/api`);
}

bootstrap();
