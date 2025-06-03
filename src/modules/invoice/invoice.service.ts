import { Injectable, HttpStatus } from '@nestjs/common';
import { FileDocument, FileUploaded } from 'src/schemas/file_uploaded.schema';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { uploadToBucket } from 'src/modules/helper/google-storage.helper';
import { Invoice, InvoiceDocument } from 'src/schemas/invoice.schema';
import vision from '@google-cloud/vision';

@Injectable()
export class InvoiceService {
  constructor(
    @InjectModel(Invoice.name) private invoiceDoc: Model<InvoiceDocument>,
    @InjectModel(FileUploaded.name) private fileDoc: Model<FileDocument>
  ) {}

  public async verificationFile(payload) {
    try {
      const keyFileContent = Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64 || '', 'base64').toString('utf8');
      const credentials = JSON.parse(keyFileContent);
      const client = new vision.ImageAnnotatorClient({ credentials });

      const [result] = await client.textDetection({
        image: { content: payload.file.buffer.toString('base64') }
      });
      const detections = result.textAnnotations;

      if (detections && detections.length > 0) {
        const remarkIndex = detections.findIndex(
          (element: { description: string }, i: number) =>
            i > 0 &&
            this.removeNaN(element.description).includes(process.env.ACCOUNT_NUMBER!) &&
            element.description.includes('VA')
        );

        if (remarkIndex <= 0) {
          return {
            code: HttpStatus.NOT_FOUND,
            success: false,
            message: 'Invoice not found'
          };
        }

        const remark = detections[remarkIndex].description;

        // find invoices
        const invList = await this.invoiceDoc.find({
          remark: { $regex: remark, $options: 'i' },
          valueDate: {
            $gte: new Date(payload.startDate),
            $lte: new Date(payload.endDate).setUTCHours(23, 59, 59, 999)
          }
        });
        if (invList.length <= 0) {
          return {
            code: HttpStatus.NOT_FOUND,
            success: false,
            message: 'Invoice not found'
          };
        }

        const invDataIndex = invList.findIndex((inv) =>
          detections.some(
            (element: { description: string }, i: number) =>
              i > 0 && inv.amount.toString() + '00' == this.removeNaN(element.description)
          )
        );
        if (invDataIndex < 0) {
          return {
            code: HttpStatus.BAD_REQUEST,
            success: false,
            message: 'No matching invoice was found'
          };
        }

        const invData = invList[invDataIndex];

        const exists = await this.fileDoc.findOne({ remark: invData.remark, amount: invData.amount });

        // Upload file to bucket
        const publicUrl = await uploadToBucket(payload.file, (invData._id as Types.ObjectId).toString());

        const data = {
          remark: invData.remark,
          amount: invData.amount,
          file_name: payload.file.originalname,
          bank: invData.remark.split('VA')[0],
          invoiceNumber: invData.invoiceNumber,
          fileUrl: publicUrl,
          invoiceId: invData._id as Types.ObjectId
        };

        if (!exists) {
          await new this.fileDoc(data).save();
        }

        return {
          code: HttpStatus.OK,
          success: true,
          message: 'Data Verified',
          data: data
        };
      } else {
        return {
          code: HttpStatus.BAD_REQUEST,
          success: false,
          message: 'No text found in the image.'
        };
      }
    } catch (error) {
      return {
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        success: false,
        message: error.message || 'Something went wrong'
      };
    }
  }

  removeNaN(text: string): string {
    return text
      .split('')
      .filter((char) => !isNaN(Number(char)) && char !== ' ')
      .join('');
  }
}
