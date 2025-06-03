import { Module } from '@nestjs/common';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { MongooseModule } from '@nestjs/mongoose';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    InvoiceModule,
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
