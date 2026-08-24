import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS untuk kemudahan integrasi dengan tim Frontend
  app.enableCors();

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global Filter & Interceptor
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new AuditLogInterceptor());

  // Swagger OpenAPI Specification Configuration
  const config = new DocumentBuilder()
    .setTitle('Nebeng App API Specification')
    .setDescription(
      'Dokumentasi API Backend Platform Nebeng Transportasi & Pengiriman Paket (Escrow Wallet & Dual QR Checkpoint)',
    )
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'register, login, logout, Refresh Token')
    .addTag('Orders', 'Pemesanan Tiket Penumpang & Pengiriman Paket (Parcel)')
    .addTag('Payments', 'Gateway Pembayaran & Escrow Balance Hold')
    .addTag('Checkpoints', 'Verifikasi Dual QR Check-in Pos Asal & Pos Tujuan')
    .addTag('Wallets', 'Ledger Mutasi Saldo & Pencairan Dana Escrow')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true, // Menyimpan Token JWT di browser meski halaman di-refresh
    },
    customSiteTitle: 'Nebeng API Documentation',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Aplikasi berjalan di: http://localhost:${port}/docs`);
}
bootstrap();
