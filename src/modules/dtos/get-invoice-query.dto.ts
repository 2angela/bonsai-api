import { ApiPropertyOptional } from '@nestjs/swagger';

export class GetInvoiceQueryDto {
  @ApiPropertyOptional({ description: 'Remark filter' })
  remark?: string;
}
