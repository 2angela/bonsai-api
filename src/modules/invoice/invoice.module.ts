import { Module } from '@nestjs/common';
import { InvoiceController } from './invoice.controller';
import { InvoiceService } from './invoice.service';
import { MongooseModule } from '@nestjs/mongoose';
import { FileUploaded, FileSchema } from '../../schemas/file_uploaded.schema';
import { Invoice, InvoiceSchema } from '../../schemas/invoice.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: FileUploaded.name, schema: FileSchema },
      { name: Invoice.name, schema: InvoiceSchema },
    ]),
  ],
  controllers: [InvoiceController],
  providers: [InvoiceService],
})
export class InvoiceModule {}
