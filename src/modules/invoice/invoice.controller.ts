import {
  Controller,
  Post,
  Body,
  UseInterceptors,
  Res,
  HttpStatus,
  UploadedFiles,
  Get,
  Query,
  Patch,
  Param
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { InvoiceService } from './invoice.service';
import { Response } from 'express';
import { ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { UploadBodyDto } from '../dtos/upload-body.dto';
import { GetInvoiceQueryDto } from '../dtos/get-invoice-query.dto';
import { UpdateInvoiceStatusDto } from '../dtos/update-invoice-status.dto';

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

  @Get('/invoice')
  @ApiOperation({ summary: 'Get Transaction By Invoice' })
  @ApiResponse({ status: 200, description: 'Successfully retrieved invoice transactions' })
  @ApiResponse({ status: 404, description: 'Invoice not found with the provided query' })
  async getInvoice(@Query() query: GetInvoiceQueryDto, @Res() res: Response) {
    const result = await this.invoiceService.getInvoice(query);

    if (result.success) {
      return res.status(HttpStatus.OK).json({
        success: result.success,
        message: result.message,
        data: result.data ?? []
      });
    } else {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: result.success,
        message: result.message,
        data: []
      });
    }
  }

  @Patch('/invoice')
  @ApiOperation({ summary: 'Patch Status By Invoice' })
  @ApiResponse({ status: 200, description: 'Successfully updated invoice status' })
  @ApiResponse({ status: 304, description: 'No changes made, invoice status already "paid"' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  async updateInvoiceStatus(@Body() body: UpdateInvoiceStatusDto, @Res() res: Response) {
    const result = await this.invoiceService.updateStatus(body.invoiceNumber);

    if (result) {
      if (result.success) {
        return res.status(result.code).json({
          success: result.success,
          message: result.message,
          results: result.data ?? {}
        });
      } else if (result.code === HttpStatus.NOT_MODIFIED) {
        return res.status(HttpStatus.NOT_MODIFIED).json({
          success: result.success,
          message: result.message,
          results: result.data ?? {}
        });
      } else if (result.code === HttpStatus.NOT_FOUND) {
        return res.status(result.code).json({
          success: result.success,
          message: result.message,
          results: result.data ?? {}
        });
      }
    }

    return res.status(HttpStatus.BAD_REQUEST).json({
      success: false,
      message: 'An unexpected error occurred',
      results: {}
    });
  }
}
