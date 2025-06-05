import { ApiProperty } from '@nestjs/swagger';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ description: 'Invoice number to update status', default: '1633136' })
  invoiceNumber: string;
}
