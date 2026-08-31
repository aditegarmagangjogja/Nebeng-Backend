import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { AuditLogInterceptor } from './common/interceptors/audit-log.interceptor';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new AuditLogInterceptor());

  const config = new DocumentBuilder()
    .setTitle('Nebeng App API Specification')
    .setDescription(
      'Dokumentasi API Backend Platform Nebeng Transportasi & Pengiriman Paket (Escrow Wallet & Dual QR Checkpoint)',
    )
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Masukkan token JWT: Bearer <token>',
        in: 'header',
      },
      'bearer',
    )
    .addTag('Auth', 'register, login, logout, Refresh Token')
    .addTag('Orders', 'Pemesanan Tiket Penumpang & Pengiriman Paket (Parcel)')
    .addTag('Payments', 'Gateway Pembayaran & Escrow Balance Hold')
    .addTag('Checkpoints', 'Verifikasi Dual QR Check-in Pos Asal & Pos Tujuan')
    .addTag('Wallets', 'Ledger Mutasi Saldo & Pencairan Dana Escrow')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  const docsDirPath = path.resolve(process.cwd(), 'swagger-spec');
  if (!fs.existsSync(docsDirPath)) {
    fs.mkdirSync(docsDirPath, { recursive: true });
  }
  fs.writeFileSync(
    path.join(docsDirPath, 'swagger.json'),
    JSON.stringify(document, null, 2),
  );

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
    customSiteTitle: 'Nebeng API Documentation',
  });

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`🚀 Aplikasi berjalan di: http://localhost:${port}/docs`);
  console.log(
    `📄 File Spec JSON untuk Postman tersimpan di: ./swagger-spec/swagger.json`,
  );
}
(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
bootstrap();
