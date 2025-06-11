import { ApiProperty } from '@nestjs/swagger';

export class UploadBodyDto {
  @ApiProperty({
    description: 'Start date in ISO format (e.g., 2025-06-01)',
    type: 'string',
    example: '2025-06-01',
    required: false
  })
  startDate: string;

  @ApiProperty({
    description: 'End date in ISO format (e.g., 2025-06-30)',
    type: 'string',
    example: '2025-06-30',
    required: false,
  })
  endDate: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    isArray: true,
    description: 'Multiple image files',
    required: true,
  })
  image: any;
}
