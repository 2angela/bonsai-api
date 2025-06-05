import { ApiProperty } from '@nestjs/swagger';

export class UpdateInvoiceStatusDto {
  @ApiProperty({ description: 'Invoice number to update status', default: 'BRIVA13950867057641161CMS PADI UMKM ASDP' })
  remark: string;
}
