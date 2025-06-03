import { Controller, Post, Body, UseInterceptors, Res, HttpStatus, UploadedFiles } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InvoiceService } from './invoice.service';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UploadBodyDto } from '../dtos/upload-body.dto';

@ApiTags('Invoice')
@Controller()
export class InvoiceController {
  constructor(private readonly invoiceService: InvoiceService) {}

  @Post('/upload')
  @ApiOperation({ summary: 'Upload invoice images and verify via OCR' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Upload invoice images',
    type: UploadBodyDto
  })
  @ApiResponse({ status: 200, description: 'Verification success' })
  @ApiResponse({ status: 400, description: 'Bad request or file not uploaded' })
  @UseInterceptors(FilesInterceptor('image', 100))
  async uploadFiles(@UploadedFiles() files: Express.Multer.File[], @Body() body: UploadBodyDto, @Res() res: Response) {
    if (!files || files.length <= 0) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: 'No image file uploaded or file type not allowed.'
      });
    }

    const results: any = [];

    for (const file of files) {
      const result = await this.invoiceService.verificationFile({
        file: file,
        ...body
      });

      results.push(result);
    }

    if (results) {
      return res.status(HttpStatus.OK).json({
        success: true,
        message: 'Batch verification completed',
        results
      });
    }
  }
}
